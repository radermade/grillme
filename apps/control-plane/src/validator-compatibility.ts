import type { CapabilityProbe, CompatibilityEntry, ValidatorBundle, ValidatorCanaryIncident, ValidatorHealth } from "@grillme/domain";

export interface CompatibilityRegistry { find(labId: string, labVersion: string, region: string, provider: CompatibilityEntry["provider"]): Promise<unknown | null> }
export interface ValidatorBundleRepository { find(id: string, version: string): Promise<unknown | null> }
export interface ValidatorHealthStore { get(compatibilityId: string, compatibilityVersion: string): Promise<unknown | null>; put(value: ValidatorHealth): Promise<void> }
export interface CapabilityProbeService { run(compatibility: CompatibilityEntry): Promise<CapabilityProbe[]> }
export interface ValidatorIncidentStore { open(value: ValidatorCanaryIncident): Promise<void> }
export const createMemoryCompatibilityRegistry = (values: CompatibilityEntry[]): CompatibilityRegistry => ({ async find(labId, labVersion, region, provider) { return values.find((value) => value.labId === labId && value.labVersion === labVersion && value.region === region && value.provider === provider) ?? null; } });
export const createMemoryValidatorBundleRepository = (values: ValidatorBundle[]): ValidatorBundleRepository => ({ async find(id, version) { return values.find((value) => value.id === id && value.version === version) ?? null; } });
export const createMemoryValidatorHealthStore = (values: ValidatorHealth[] = []): ValidatorHealthStore => ({ async get(id, version) { return values.find((value) => value.compatibilityId === id && value.compatibilityVersion === version) ?? null; }, async put(value) { const index = values.findIndex((item) => item.compatibilityId === value.compatibilityId && item.compatibilityVersion === value.compatibilityVersion); if (index < 0) values.push(value); else values[index] = value; } });
export const createControlledCapabilityProbes = (now: () => string): CapabilityProbeService => ({ async run() { const observedAt = now(); const expiresAt = new Date(Date.parse(observedAt) + 3_600_000).toISOString(); return ["service", "model", "region", "inspector-permission", "template", "cost-policy"].map((type, index) => ({ id: `probe-${index + 1}`, type: type as CapabilityProbe["type"], status: "passed", observedAt, expiresAt, reason: null })); } });
export const createMemoryValidatorIncidentStore = (): ValidatorIncidentStore & { incidents: ValidatorCanaryIncident[] } => { const incidents: ValidatorCanaryIncident[] = []; return { incidents, async open(value) { incidents.push(value); } }; };
export const createLabCompatibilityService = (input: { registry: CompatibilityRegistry; bundles: ValidatorBundleRepository; health: ValidatorHealthStore; probes: CapabilityProbeService; now(): string }) => ({
  async resolve(labId: string, labVersion: string) {
    const { parseCompatibilityEntry, parseValidatorBundle, parseValidatorHealth } = await import("@grillme/content");
    const compatibility = parseCompatibilityEntry(await input.registry.find(labId, labVersion, "us-east-1", "controlled-sandbox"));
    if (compatibility.status === "withdrawn") throw new Error("COMPATIBILITY_WITHDRAWN");
    const bundle = parseValidatorBundle(await input.bundles.find(compatibility.validatorBundleId, compatibility.validatorBundleVersion));
    if (bundle.status === "withdrawn" || bundle.labId !== labId || bundle.labVersion !== labVersion || bundle.id !== compatibility.validatorBundleId || bundle.version !== compatibility.validatorBundleVersion) throw new Error("VALIDATOR_WITHDRAWN");
    const health = parseValidatorHealth(await input.health.get(compatibility.id, compatibility.version));
    const fresh = Date.parse(health.expiresAt) > Date.parse(input.now());
    const degradedAllowed = health.status === "degraded" && compatibility.status === "degraded-reviewed" && !!health.reviewedDegradedPolicyId;
    if (!fresh || health.status === "disabled" || health.status === "drift-suspected" || health.status === "degraded" && !degradedAllowed) throw new Error("VALIDATOR_UNHEALTHY");
    const probes = await input.probes.run(compatibility);
    const requiredProbeTypes: CapabilityProbe["type"][] = ["service", "model", "region", "inspector-permission", "template", "cost-policy"];
    if (requiredProbeTypes.some((type) => !probes.some((probe) => probe.type === type && probe.status === "passed" && Date.parse(probe.expiresAt) > Date.parse(input.now())))) throw new Error("CAPABILITY_UNAVAILABLE");
    return { compatibility, bundle, health };
  },
});