import { parseCompatibilityEntry, parseManagedConsoleValidation, parseValidatorBundle, parseValidatorHealth } from "@grillme/content";
import type { ManagedConsoleBudget, ManagedConsoleLaunch, ManagedConsoleSession, ValidationProvenance } from "@grillme/domain";
import type { ManagedConsoleDependencies, ManagedConsoleRecord } from "./managed-console-contracts";

export class ManagedConsoleError extends Error {
  constructor(readonly code: "INVALID_REQUEST" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "EXPIRED" | "RATE_LIMITED" | "BUDGET_EXCEEDED" | "UNAVAILABLE", message: string) { super(message); this.name = "ManagedConsoleError"; }
}
const addMinutes = (value: string, minutes: number) => new Date(Date.parse(value) + minutes * 60_000).toISOString();
const publicProvenance = (record: ManagedConsoleRecord): ValidationProvenance => { const { compatibilityId: _, compatibilityVersion: __, ...value } = record.session.provenance; return value; };
const validateLaunch = (value: { launchUrl: string; launchExpiresAt: string }, sessionExpiresAt: string, now: string) => {
  let url: URL; try { url = new URL(value.launchUrl); } catch { throw new ManagedConsoleError("UNAVAILABLE", "Managed console launch URL is invalid."); }
  const expires = Date.parse(value.launchExpiresAt); const issued = Date.parse(now);
  if (url.protocol !== "https:" || !Number.isFinite(expires) || expires <= issued || expires > issued + 60_000 || expires > Date.parse(sessionExpiresAt)) throw new ManagedConsoleError("UNAVAILABLE", "Managed console launch URL exceeded its policy.");
  return value;
};
export const createManagedConsoleService = (deps: ManagedConsoleDependencies) => {
  const identity = async (authorization: string) => { const value = await deps.auth.authenticate(authorization); if (!value) throw new ManagedConsoleError("UNAUTHORIZED", "Authentication is required."); return value; };
  const owned = async (authorization: string, sessionId: string) => {
    const auth = await identity(authorization); const record = await deps.store.get(sessionId);
    if (!record || record.userId !== auth.userId) throw new ManagedConsoleError("NOT_FOUND", "Managed console session is unavailable.");
    if (record.session.status !== "active" || Date.parse(record.session.expiresAt) <= Date.parse(deps.clock.now())) { if (record.session.status === "active") await revokeRecord(record, "expired"); throw new ManagedConsoleError("EXPIRED", "Managed console session expired."); }
    return record;
  };
  const audit = (record: ManagedConsoleRecord, operation: import("@grillme/domain").ManagedConsoleAuditEvent["operation"], outcome: import("@grillme/domain").ManagedConsoleAuditEvent["outcome"], costUsd = 0) => deps.audit.record({ schemaVersion: 1, id: deps.ids.create(), sessionId: record.session.id, labSessionId: record.session.labSessionId, userId: record.userId, operation, outcome, costUsd, occurredAt: deps.clock.now() });
  const revokeRecord = async (record: ManagedConsoleRecord, status: "revoked" | "expired") => {
    if ((record.session.status === "revoked" || record.session.status === "expired") && record.accessRevoked && record.resourcesCleaned) return record.session;
    const revoking = { ...record, revision: record.revision + 1, session: { ...record.session, status: "revoking" as const } }; await deps.store.put(revoking);
    let accessRevoked = record.accessRevoked; let resourcesCleaned = record.resourcesCleaned; let cleanupError: unknown = null;
    if (!accessRevoked) try { await deps.provider.revokeAccess(record.providerHandle); accessRevoked = true; await audit(record, "revoke-access", "completed"); }
    catch (error) { cleanupError = error; await audit(record, "revoke-access", "failed"); }
    if (!resourcesCleaned) try { await deps.provider.cleanupResources(record.providerHandle); resourcesCleaned = true; await audit(record, "cleanup", "completed"); }
    catch (error) { cleanupError ??= error; await audit(record, "cleanup", "failed"); }
    const session = { ...record.session, status }; await deps.store.put({ ...revoking, revision: revoking.revision + 1, session, accessRevoked, resourcesCleaned });
    if (cleanupError) throw new ManagedConsoleError("UNAVAILABLE", "Managed console cleanup requires reconciliation.");
    return session;
  };
  const currentHealth = async (record: ManagedConsoleRecord) => {
    const health = parseValidatorHealth(await deps.health.get(record.session.provenance.compatibilityId, record.session.provenance.compatibilityVersion));
    if (health.status === "disabled" || health.status === "drift-suspected" || Date.parse(health.expiresAt) <= Date.parse(deps.clock.now())) { await revokeRecord(record, "revoked"); throw new ManagedConsoleError("UNAVAILABLE", "Managed console compatibility is no longer healthy."); }
    return health;
  };
  return {
    async launch(authorization: string, labSessionId: string, policyId: string, policyVersion: string): Promise<ManagedConsoleLaunch> {
      const auth = await identity(authorization); const lab = await deps.labs.get(labSessionId);
      if (!lab || lab.userId !== auth.userId || lab.stopped || lab.session.status !== "ready") throw new ManagedConsoleError("NOT_FOUND", "Active lab session is required.");
      const policy = await deps.policies.find(policyId, policyVersion);
      if (!policy || policy.labId !== lab.session.labId || policy.labVersion !== lab.session.labVersion) throw new ManagedConsoleError("FORBIDDEN", "Managed console policy is unavailable.");
      if (!await deps.entitlements.authorize({ userId: auth.userId, labId: policy.labId, labVersion: policy.labVersion, feature: "managed-console" })) throw new ManagedConsoleError("FORBIDDEN", "Managed console access is unavailable.");
      const compatibility = parseCompatibilityEntry(await deps.compatibility.find(policy.labId, policy.labVersion, policy.region, "managed-aws"));
      const bundle = parseValidatorBundle(await deps.bundles.find(compatibility.validatorBundleId, compatibility.validatorBundleVersion));
      const health = parseValidatorHealth(await deps.health.get(compatibility.id, compatibility.version));
      if (compatibility.status !== "active" || bundle.status !== "active" || health.status !== "healthy" || Date.parse(health.expiresAt) <= Date.parse(deps.clock.now())) throw new ManagedConsoleError("UNAVAILABLE", "Managed console compatibility is not healthy.");
      const existing = await deps.store.findByLabSession(labSessionId);
      if (existing && existing.session.status === "active") {
        if (existing.launchCount >= 3) throw new ManagedConsoleError("RATE_LIMITED", "Console launch limit reached.");
        const reserved = await deps.store.consumeLaunch(existing.session.id);
        if (!reserved) throw new ManagedConsoleError("RATE_LIMITED", "A one-time launch is already pending.");
        try {
          const launch = validateLaunch(await deps.provider.createLaunch(existing.providerHandle, existing.session.expiresAt), existing.session.expiresAt, deps.clock.now()); const consumed = await deps.store.finishLaunch(existing.session.id, deps.clock.now()); if (!consumed) throw new Error("Launch reservation unavailable.");
          await audit(consumed, "launch", "completed"); return { schemaVersion: 1, session: consumed.session, ...launch };
        } catch { await revokeRecord(reserved, "revoked"); throw new ManagedConsoleError("UNAVAILABLE", "One-time console launch could not be issued."); }
      }
      const issuedAt = deps.clock.now(); const expiresAt = [addMinutes(issuedAt, policy.credentialDurationMinutes), lab.session.expiresAt].sort()[0]!;
      const provenance = { validatorId: bundle.validatorId, validatorVersion: bundle.validatorVersion, bundleId: bundle.id, bundleVersion: bundle.version, mappingId: compatibility.id, mappingVersion: compatibility.semanticMappingVersion, presentationMappingVersion: compatibility.presentationMappingVersion, templateId: compatibility.templateId, templateVersion: compatibility.templateVersion, region: compatibility.region, provider: compatibility.provider, providerAdapterVersion: compatibility.providerAdapterVersion, compatibilityId: compatibility.id, compatibilityVersion: compatibility.version } as const;
      const session: ManagedConsoleSession = { schemaVersion: 1, id: deps.ids.create(), labSessionId, policyId, policyVersion, status: "active", region: policy.region, issuedAt, expiresAt, spendLimitUsd: policy.spendLimitUsd, spentUsd: 0, provenance };
      const allocated = await deps.provider.allocate({ sessionId: session.id, labSession: lab.session, policy, provenance, expiresAt });
      const record: ManagedConsoleRecord = { session, userId: auth.userId, providerHandle: allocated.providerHandle, launchCount: 0, launchConsumedAt: null, accessRevoked: false, resourcesCleaned: false, revision: 1 };
      const stored = await deps.store.putIfAbsent(record); if (!stored.created) { await deps.provider.revokeAccess(allocated.providerHandle); await deps.provider.cleanupResources(allocated.providerHandle); throw new ManagedConsoleError("RATE_LIMITED", "Managed console session already exists."); }
      await audit(record, "allocate", "completed");
      const reserved = await deps.store.consumeLaunch(session.id); if (!reserved) { await revokeRecord(record, "revoked"); throw new ManagedConsoleError("UNAVAILABLE", "One-time console launch could not be reserved."); }
      try {
        const launch = validateLaunch(await deps.provider.createLaunch(record.providerHandle, session.expiresAt), session.expiresAt, deps.clock.now()); const consumed = await deps.store.finishLaunch(session.id, deps.clock.now()); if (!consumed) throw new Error("Launch reservation unavailable.");
        await audit(consumed, "launch", "completed"); return { schemaVersion: 1, session: consumed.session, ...launch };
      } catch { await revokeRecord(reserved, "revoked"); throw new ManagedConsoleError("UNAVAILABLE", "One-time console launch could not be issued."); }
    },
    async restore(authorization: string, labSessionId: string): Promise<ManagedConsoleSession | null> {
      const auth = await identity(authorization); const record = await deps.store.findByLabSession(labSessionId); if (!record || record.userId !== auth.userId) return null;
      if (record.session.status === "active" && Date.parse(record.session.expiresAt) <= Date.parse(deps.clock.now())) return revokeRecord(record, "expired");
      await audit(record, "restore", "completed"); return record.session;
    },
    async status(authorization: string, sessionId: string): Promise<ManagedConsoleSession> {
      const record = await owned(authorization, sessionId); await currentHealth(record); const status = await deps.provider.status(record.providerHandle);
      if (status !== "active") { await revokeRecord(record, "revoked"); throw new ManagedConsoleError("UNAVAILABLE", "Managed console provider is unavailable."); }
      await audit(record, "status", "completed"); return record.session;
    },
    async budget(authorization: string, sessionId: string): Promise<ManagedConsoleBudget> {
      const record = await owned(authorization, sessionId); await currentHealth(record); const measured = await deps.provider.budget(record.providerHandle);
      if (measured.spentUsd < 0 || measured.spentUsd > record.session.spendLimitUsd) { await revokeRecord(record, "revoked"); throw new ManagedConsoleError("BUDGET_EXCEEDED", "Managed console spend ceiling reached."); }
      const session = { ...record.session, spentUsd: measured.spentUsd }; await deps.store.put({ ...record, session, revision: record.revision + 1 });
      const remainingUsd = session.spendLimitUsd - session.spentUsd; const exhausted = remainingUsd <= 0; await audit(record, "budget", "completed", measured.spentUsd);
      if (exhausted) await revokeRecord({ ...record, session }, "revoked");
      return { schemaVersion: 1, sessionId, spendLimitUsd: session.spendLimitUsd, spentUsd: session.spentUsd, remainingUsd, exhausted, observedAt: deps.clock.now() };
    },
    async validate(authorization: string, sessionId: string, checkpointId: string) {
      const record = await owned(authorization, sessionId);
      if (!checkpointId || checkpointId.length > 200) throw new ManagedConsoleError("INVALID_REQUEST", "Checkpoint is invalid.");
      const health = parseValidatorHealth(await deps.health.get(record.session.provenance.compatibilityId, record.session.provenance.compatibilityVersion));
      const stale = Date.parse(health.expiresAt) <= Date.parse(deps.clock.now());
      if (health.status === "disabled" || health.status === "drift-suspected" || stale) {
        await revokeRecord(record, "revoked");
        return { schemaVersion: 1 as const, status: "inconclusive" as const, provenance: publicProvenance(record), failedCheckIds: [], feedback: ["Managed console validation is not currently trustworthy. Access was revoked safely."], evidence: [], inconclusiveReason: health.status === "disabled" ? "disabled-validator" as const : health.status === "drift-suspected" ? "schema-drift" as const : "stale-health" as const, observedAt: deps.clock.now() };
      }
      try {
        const value = parseManagedConsoleValidation(await deps.provider.validate(record.providerHandle, checkpointId, publicProvenance(record), deps.clock.now()));
        if (!value) throw new Error("Invalid validation.");
        await audit(record, "validate", value.status === "inconclusive" ? "inconclusive" : "completed");
        return value;
      } catch {
        await audit(record, "validate", "inconclusive");
        return { schemaVersion: 1 as const, status: "inconclusive" as const, provenance: publicProvenance(record), failedCheckIds: [], feedback: ["Managed console validation is temporarily unavailable."], evidence: [], inconclusiveReason: "service-unavailable" as const, observedAt: deps.clock.now() };
      }
    },
    async revoke(authorization: string, sessionId: string) { return revokeRecord(await owned(authorization, sessionId), "revoked"); },
    async revokeForLab(authorization: string, labSessionId: string) { const auth = await identity(authorization); const record = await deps.store.findByLabSession(labSessionId); if (!record || record.userId !== auth.userId) throw new ManagedConsoleError("NOT_FOUND", "Managed console session is unavailable."); return revokeRecord(record, "revoked"); },
    async revokeForSession(labSessionId: string) { const record = await deps.store.findByLabSession(labSessionId); if (record) await revokeRecord(record, "revoked"); },
    async revokeForUser(userId: string) { for (const record of (await deps.store.listActive()).filter((value) => value.userId === userId)) await revokeRecord(record, "revoked"); },
    async sweep() {
          const active = await deps.store.listActive();
          const partial = active.filter(({ session, accessRevoked, resourcesCleaned }) => session.status !== "active" && (!accessRevoked || !resourcesCleaned));
          for (const record of partial) try { await revokeRecord({ ...record, session: { ...record.session, status: "active" } }, record.session.status === "expired" ? "expired" : "revoked"); } catch { /* retained for next sweep */ }
          const beforeExpiry = await deps.store.listActive();
          const expired = beforeExpiry.filter(({ session }) => session.status === "active" && Date.parse(session.expiresAt) <= Date.parse(deps.clock.now()));
          for (const record of expired) try { await revokeRecord(record, "expired"); } catch { /* retained for next sweep */ }
          const beforeHealth = await deps.store.listActive();
          let unhealthy = 0;
          for (const record of beforeHealth.filter(({ session }) => session.status === "active")) {
            try { await currentHealth(record); } catch { unhealthy += 1; }
          }
          const known = new Set((await deps.store.listActive()).map(({ providerHandle }) => providerHandle));
          const orphaned = (await deps.provider.listActiveHandles()).filter((handle) => !known.has(handle));
          for (const handle of orphaned) { await deps.provider.revokeAccess(handle); await deps.provider.cleanupResources(handle); }
          return { expired: expired.length, unhealthy, orphaned: orphaned.length };
        }
,
  };
};