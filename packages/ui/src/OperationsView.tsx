import { useEffect, useMemo, useRef } from "react";
import { useMachine } from "@xstate/react";
import { createAnalyticsConsentMachine, createEntitlementMachine, createPrivacyMachine, createReleaseMachine, createSupportMachine } from "@grillme/machines";
import { useUiRuntime } from "./runtime";

import { Panel } from "./primitives";
export function OperationsView() {
  const { analytics, applicationPlatform, connectivity, entitlements, fixtures, platform, privacy, releases, support } = useUiRuntime();
  const { release, requirements } = fixtures;
  const analyticsMachine = useMemo(() => createAnalyticsConsentMachine(platform.storage, analytics, platform.clock), [analytics, platform.clock, platform.storage]);
  const privacyMachine = useMemo(() => createPrivacyMachine(privacy, platform.ids, platform.clock), [platform.clock, platform.ids, privacy]);
  const entitlementMachine = useMemo(() => createEntitlementMachine(entitlements, platform.clock), [entitlements, platform.clock]);
  const releaseMachine = useMemo(() => createReleaseMachine(release.channel as "beta", "0.1.0", releases), [release.channel, releases]);
  const supportMachine = useMemo(() => createSupportMachine({ schemaVersion: 1, appVersion: "0.1.0", platform: applicationPlatform, releaseChannel: "beta", connectivity: connectivity.current(), pendingSyncCount: 0, activeWorkflow: "operations", errorCodes: [], generatedAt: platform.clock.now() }, support), [applicationPlatform, connectivity, platform.clock, support]);
  const [analyticsState, sendAnalytics] = useMachine(analyticsMachine, {});
  const [privacyState, sendPrivacy] = useMachine(privacyMachine, {});
  const [entitlementState, sendEntitlement] = useMachine(entitlementMachine, {});
  const [releaseState, sendRelease] = useMachine(releaseMachine, {});
  const [supportState, sendSupport] = useMachine(supportMachine, {});
  const recordedOpen = useRef(false);
  useEffect(() => {
    if (!analyticsState.context.consent.productAnalytics || recordedOpen.current) return;
    recordedOpen.current = true;
    const id = platform.ids.create();
    sendAnalytics({ type: "RECORD", event: { schemaVersion: 1, id, idempotencyKey: id, name: "app.opened", occurredAt: platform.clock.now(), fields: { appVersion: "0.1.0", channel: "beta", platform: applicationPlatform } } });
  }, [analyticsState.context.consent.productAnalytics, sendAnalytics]);
  useEffect(() => {
    if (analyticsState.matches("ready") && analyticsState.context.consent.productAnalytics && analyticsState.context.pending.length) sendAnalytics({ type: "FLUSH" });
  }, [analyticsState.value, analyticsState.context.consent.productAnalytics, analyticsState.context.pending.length, sendAnalytics]);
  return <main><p className="eyebrow">Local beta operations</p><h1>Account, privacy, and support</h1><div className="callout warning"><strong>Not production operated</strong><p>Billing, hosted identity, account export/deletion, analytics retention, signed distribution, and staffed support require deployed providers and approvals.</p></div>
    <div className="results">
      <Panel title="Product analytics"><p>Optional and disabled by default. Events contain predefined operational fields only, never prompts, responses, diagnoses, credentials, or file contents.</p><p role="status">Current preference: {analyticsState.context.consent.productAnalytics ? "on" : "off"}</p><button onClick={() => sendAnalytics({ type: analyticsState.context.consent.productAnalytics ? "OPT_OUT" : "OPT_IN" })}>{analyticsState.context.consent.productAnalytics ? "Turn off and delete analytics" : "Opt in"}</button>{analyticsState.context.error && <p role="alert">{analyticsState.context.error}</p>}</Panel>
      <Panel title="Entitlement"><p>{entitlementState.matches("active") ? `${entitlementState.context.entitlement?.plan} access is active.` : entitlementState.matches("grace") ? "Access is in a temporary server-approved grace period." : entitlementState.matches("blocked") ? "Commercial access is unavailable." : "Entitlement requires the deployed control plane."}</p><button onClick={() => sendEntitlement({ type: entitlementState.matches("failed") ? "RETRY" : "REFRESH" })}>Refresh entitlement</button></Panel>
      <Panel title="Your data"><p>Export and deletion are authenticated server requests. Deletion requires confirmation and is irreversible after processing.</p>{privacyState.matches("confirmingDeletion") ? <><p role="alert">Confirm account deletion. This schedules deletion across configured data services.</p><button onClick={() => sendPrivacy({ type: "REQUEST_DELETE" })}>Confirm deletion</button><button onClick={() => sendPrivacy({ type: "RESET" })}>Cancel</button></> : <div className="actions"><button onClick={() => sendPrivacy({ type: "REQUEST_EXPORT" })}>Request data export</button><button onClick={() => sendPrivacy({ type: "REQUEST_DELETE" })}>Request account deletion</button></div>}{privacyState.context.receipt && <p role="status">{privacyState.context.receipt.type} request {privacyState.context.receipt.status}.</p>}{privacyState.context.error && <p role="alert">{privacyState.context.error}</p>}</Panel>
      <Panel title="Support diagnostics"><p>The snapshot includes app version, platform, release channel, connectivity, pending-sync count, active workflow, and sanitized error codes only.</p><button disabled={supportState.matches("submitting")} onClick={() => sendSupport({ type: supportState.matches("failed") ? "RETRY" : "SUBMIT" })}>{supportState.matches("submitted") ? "Diagnostics submitted" : "Submit diagnostics"}</button>{supportState.context.error && <p role="alert">{supportState.context.error}</p>}</Panel>
      <Panel title="Release status"><p>Channel: beta · current version 0.1.0</p><p>{releaseState.matches("current") ? "This build matches its assignment." : releaseState.matches("updateAvailable") ? `Update ${releaseState.context.assignment?.assignedVersion} is assigned.` : releaseState.matches("rollbackRequired") ? `Rollback to ${releaseState.context.assignment?.assignedVersion} is required.` : releaseState.matches("unsupported") ? "This version is below the minimum supported version." : "Release status requires the deployed control plane."}</p><button onClick={() => sendRelease({ type: releaseState.matches("failed") ? "RETRY" : "CHECK" })}>Check release</button></Panel>
    </div>
    <Panel title="Platform and connectivity requirements">{Object.entries(requirements).map(([category, items]) => <div key={category}><h3>{category}</h3><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></div>)}</Panel>
  </main>;
}
