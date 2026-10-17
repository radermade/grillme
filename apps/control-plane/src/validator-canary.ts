import { assign, fromPromise, setup } from "xstate";
import { parseCompatibilityEntry, parseValidatorBundle } from "@grillme/content";
import type { CapabilityProbe, CompatibilityEntry, LabValidation, ValidationProvenance, ValidatorBundle, ValidatorCanaryIncident, ValidatorFixture, ValidatorHealth } from "@grillme/domain";
import type { CapabilityProbeService, CompatibilityRegistry, ValidatorBundleRepository, ValidatorHealthStore, ValidatorIncidentStore } from "./validator-compatibility";

export interface ValidatorCanaryAdapter { run(fixture: ValidatorFixture, bundle: ValidatorBundle, provenance: ValidationProvenance): Promise<LabValidation> }
export type ValidatorCanaryDependencies = { provider: import("@grillme/domain").ValidatorProvider; registry: CompatibilityRegistry; bundles: ValidatorBundleRepository; health: ValidatorHealthStore; probes: CapabilityProbeService; incidents: ValidatorIncidentStore; adapter: ValidatorCanaryAdapter; ids: { create(): string }; clock: { now(): string } };
type Context = { labId: string; labVersion: string; compatibility: CompatibilityEntry | null; bundle: ValidatorBundle | null; probes: CapabilityProbe[]; results: ValidatorHealth["fixtureResults"]; health: ValidatorHealth | null; error: string | null };
type Event = { type: "TRIGGER" } | { type: "RETRY" } | { type: "DISABLE" } | { type: "ENABLE" };
type Done<T> = { output: T }; const output = <T>(event: unknown) => (event as Done<T>).output;
const requiredProbeTypes: CapabilityProbe["type"][] = ["service", "model", "region", "inspector-permission", "template", "cost-policy"];
const provenance = (compatibility: CompatibilityEntry, bundle: ValidatorBundle): ValidationProvenance => ({ validatorId: bundle.validatorId, validatorVersion: bundle.validatorVersion, bundleId: bundle.id, bundleVersion: bundle.version, mappingId: compatibility.id, mappingVersion: compatibility.semanticMappingVersion, presentationMappingVersion: compatibility.presentationMappingVersion, templateId: compatibility.templateId, templateVersion: compatibility.templateVersion, region: compatibility.region, provider: compatibility.provider, providerAdapterVersion: compatibility.providerAdapterVersion });
const incidentReason = (fixture: ValidatorFixture, actual: LabValidation["status"]): ValidatorCanaryIncident["reason"] => fixture.kind === "known-good" && actual !== "passed" ? "known-good-failed" : fixture.kind === "known-bad" && actual === "passed" ? "known-bad-passed" : fixture.kind === "unsupported" && actual === "passed" ? "unsupported-passed" : "provider-divergence";
export const createValidatorCanaryMachine = (labId: string, labVersion: string, deps: ValidatorCanaryDependencies) => setup({
  types: { context: {} as Context, events: {} as Event },
  actors: {
    load: fromPromise<{ compatibility: CompatibilityEntry; bundle: ValidatorBundle }>(async () => { const compatibility = parseCompatibilityEntry(await deps.registry.find(labId, labVersion, "us-east-1", deps.provider)); const bundle = parseValidatorBundle(await deps.bundles.find(compatibility.validatorBundleId, compatibility.validatorBundleVersion)); return { compatibility, bundle }; }),
    probe: fromPromise<CapabilityProbe[], { compatibility: CompatibilityEntry }>(async ({ input }) => deps.probes.run(input.compatibility)),
    fixtures: fromPromise<ValidatorHealth["fixtureResults"], { compatibility: CompatibilityEntry; bundle: ValidatorBundle }>(async ({ input }) => { const pinned = provenance(input.compatibility, input.bundle); const results = []; for (const fixture of input.bundle.fixtures) { const actual = await deps.adapter.run(fixture, input.bundle, pinned); results.push({ fixtureId: fixture.id, expectedStatus: fixture.expectedStatus, actualStatus: actual.status, matched: fixture.expectedStatus === actual.status && (fixture.expectedStatus !== "failed" || fixture.expectedFailedCheckIds.every((id) => actual.failedCheckIds.includes(id))) }); } return results; }),
    disable: fromPromise<void, { context: Context }>(async ({ input }) => {
      const compatibility = input.context.compatibility ?? parseCompatibilityEntry(await deps.registry.find(labId, labVersion, "us-east-1", deps.provider));
      const now = deps.clock.now();
      const health: ValidatorHealth = { schemaVersion: 1, compatibilityId: compatibility.id, compatibilityVersion: compatibility.version, status: "disabled", fixtureResults: input.context.results, probes: input.context.probes, checkedAt: now, expiresAt: now, reviewedDegradedPolicyId: null };
      await deps.health.put(health);
    }),
    record: fromPromise<ValidatorHealth, { context: Context }>(async ({ input }) => { const { compatibility, probes, results } = input.context; if (!compatibility) throw new Error("Compatibility unavailable."); const probesPassed = requiredProbeTypes.every((type) => probes.some((probe) => probe.type === type && probe.status === "passed" && Date.parse(probe.expiresAt) > Date.parse(deps.clock.now()))); const fixturesPassed = results.every(({ matched }) => matched); const checkedAt = deps.clock.now(); const health: ValidatorHealth = { schemaVersion: 1, compatibilityId: compatibility.id, compatibilityVersion: compatibility.version, status: !probesPassed ? "degraded" : fixturesPassed ? "healthy" : "drift-suspected", fixtureResults: results, probes, checkedAt, expiresAt: new Date(Date.parse(checkedAt) + 3_600_000).toISOString(), reviewedDegradedPolicyId: null }; await deps.health.put(health); if (health.status !== "healthy") { const mismatch = results.find(({ matched }) => !matched); const fixture = input.context.bundle?.fixtures.find(({ id }) => id === mismatch?.fixtureId); const reason = !probesPassed ? "probe-failed" : fixture ? incidentReason(fixture, mismatch!.actualStatus) : "provider-divergence"; await deps.incidents.open({ schemaVersion: 1, id: deps.ids.create(), compatibilityId: compatibility.id, healthStatus: health.status, reason, status: "open", createdAt: checkedAt }); } return health; }),
  },
  actions: { loaded: assign(({ event }) => ({ ...output<{ compatibility: CompatibilityEntry; bundle: ValidatorBundle }>(event), error: null })), probed: assign(({ event }) => ({ probes: output<CapabilityProbe[]>(event), error: null })), fixturesRun: assign(({ event }) => ({ results: output<ValidatorHealth["fixtureResults"]>(event), error: null })), recorded: assign(({ event }) => ({ health: output<ValidatorHealth>(event), error: null })), failed: assign({ error: () => "Validator canary could not produce trustworthy health." }) },
  guards: { healthy: ({ context }) => context.health?.status === "healthy", driftSuspected: ({ context }) => context.health?.status === "drift-suspected", disabled: ({ context }) => context.health?.status === "disabled" },
}).createMachine({
  id: "validatorCanary", initial: "scheduled", context: { labId, labVersion, compatibility: null, bundle: null, probes: [], results: [], health: null, error: null },
  states: {
    scheduled: { on: { TRIGGER: "loading", DISABLE: "disabling" } },
    loading: { invoke: { src: "load", onDone: { target: "probing", actions: "loaded" }, onError: { target: "failed", actions: "failed" } } },
    probing: { invoke: { src: "probe", input: ({ context }) => ({ compatibility: context.compatibility! }), onDone: { target: "runningFixtures", actions: "probed" }, onError: { target: "recording", actions: [assign({ probes: ({ context }) => [{ id: "probe-failure", type: "service", status: "inconclusive", observedAt: deps.clock.now(), expiresAt: deps.clock.now(), reason: "Probe infrastructure failed." }, ...context.probes] }), "failed"] } } },
    runningFixtures: { invoke: { src: "fixtures", input: ({ context }) => ({ compatibility: context.compatibility!, bundle: context.bundle! }), onDone: { target: "recording", actions: "fixturesRun" }, onError: { target: "recording", actions: [assign({ results: ({ context }) => context.bundle?.fixtures.map((fixture) => ({ fixtureId: fixture.id, expectedStatus: fixture.expectedStatus, actualStatus: "inconclusive" as const, matched: false })) ?? [] }), "failed"] } } },
    recording: { invoke: { src: "record", input: ({ context }) => ({ context }), onDone: { target: "reconciling", actions: "recorded" }, onError: { target: "failed", actions: "failed" } } },
    reconciling: { always: [{ target: "healthy", guard: "healthy" }, { target: "disabled", guard: "disabled" }, { target: "driftSuspected", guard: "driftSuspected" }, { target: "degraded" }] },
    healthy: { on: { TRIGGER: "loading", DISABLE: "disabling" } },
    driftSuspected: { on: { RETRY: "loading", DISABLE: "disabling" } },
    degraded: { on: { RETRY: "loading", DISABLE: "disabling" } },
    disabling: { invoke: { src: "disable", input: ({ context }) => ({ context }), onDone: "disabled", onError: { target: "failed", actions: "failed" } } },
    disabled: { on: { ENABLE: "scheduled" } },
    failed: { on: { RETRY: "loading", DISABLE: "disabling" } },
  },
});

export const createControlledValidatorCanaryAdapter = (now: () => string): ValidatorCanaryAdapter => ({
  async run(fixture, bundle, pinned) {
    if (fixture.kind === "unsupported") return { schemaVersion: 1, status: "inconclusive", provenance: pinned, failedCheckIds: [], feedback: ["Fixture intentionally unsupported."], evidence: [], inconclusiveReason: "unavailable-evidence", observedAt: now() };
    const checks = Object.entries(fixture.expectedState); const failed = checks.filter(([id, expected]) => fixture.observedState[id] !== expected);
    return { schemaVersion: 1, status: failed.length ? "failed" : "passed", provenance: pinned, failedCheckIds: failed.map(([id]) => id), feedback: failed.map(([id]) => `${fixture.capability} check ${id} did not match.`), evidence: checks.map(([id, expected]) => ({ checkId: id, observed: String(fixture.observedState[id] ?? false), expected: String(expected) })), inconclusiveReason: null, observedAt: now() };
  },
});