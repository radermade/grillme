import { useEffect, useMemo } from "react";
import { useMachine } from "@xstate/react";
import { createAwsCredentialMachine } from "@grillme/machines";
import { useUiRuntime } from "./runtime";

export function AwsLabView({ labSessionId }: { labSessionId: string }) {
  const { aws, connectivity, fixtures, platform } = useUiRuntime();
  const policy = fixtures.awsLabPolicy;
  const machine = useMemo(() => createAwsCredentialMachine(policy, labSessionId, platform.storage, aws, platform.clock), [aws, labSessionId, platform.clock, platform.storage, policy]);
  const [state, send] = useMachine(machine, {});
  const { lease, lastReceipt, error } = state.context;
  useEffect(() => connectivity.subscribe((status) => send({ type: status === "online" ? "NETWORK_ONLINE" : "NETWORK_OFFLINE" })), [send]);
  useEffect(() => { const timer = window.setInterval(() => send({ type: "TICK" }), 30_000); return () => window.clearInterval(timer); }, [send]);
  if (state.matches("checking") || state.matches("requesting") || state.matches("persistingLease") || state.matches("restoringRemote")) return <section aria-labelledby="aws-lab-title"><h2 id="aws-lab-title">Checking restricted AWS access</h2><p role="status">Verifying the server-side lease…</p></section>;
  if (state.matches("idle")) return <section aria-labelledby="aws-lab-title"><p className="eyebrow">Restricted real-AWS capability</p><h2 id="aws-lab-title">Guided Bedrock invocation</h2><p>Region: {policy.region} · Duration: {policy.credentialDurationMinutes} minutes · Spend ceiling: ${policy.spendLimitUsd.toFixed(2)}</p><p>This local build proves policy enforcement with a controlled provider. It does not issue AWS credentials.</p>{error && <p role="alert">{error.message}</p>}<button className="primary" onClick={() => send({ type: "ISSUE" })}>Request restricted lease</button></section>;
  if (state.matches("reconnecting")) return <section aria-labelledby="aws-lab-title"><h2 id="aws-lab-title">Restricted AWS lab offline</h2><p role="alert">Privileged operations are unavailable offline.</p><button className="secondary" onClick={() => send({ type: "REVOKE" })}>Revoke lease</button></section>;
  if (state.matches("failed")) return <section aria-labelledby="aws-lab-title"><h2 id="aws-lab-title">Restricted AWS operation unavailable</h2><p role="alert">{error?.message}</p><div className="actions"><button onClick={() => send({ type: "RETRY" })}>Retry</button>{lease && <button onClick={() => send({ type: "REVOKE" })}>Revoke lease</button>}</div></section>;
  if (state.matches("revoking") || state.matches("removing") || state.matches("expired")) return <section aria-labelledby="aws-lab-title"><h2 id="aws-lab-title">Revoking restricted access</h2><p role="status">The server is ending the credential lease…</p></section>;
  if (state.matches("revoked")) return <section aria-labelledby="aws-lab-title"><h2 id="aws-lab-title">Restricted access ended</h2><p>The server-side lease was revoked and local lease metadata was removed.</p></section>;
  return <section aria-labelledby="aws-lab-title"><p className="eyebrow">Brokered AWS operation</p><h2 id="aws-lab-title">Guided Bedrock invocation</h2><p>Region: {lease?.region} · Expires: {lease ? new Date(lease.expiresAt).toLocaleTimeString() : "unknown"} · Spend: ${lease?.spentUsd.toFixed(2)} / ${lease?.spendLimitUsd.toFixed(2)}</p><p>The client sends a constrained operation descriptor. Credentials remain server-side.</p>
    {lastReceipt && <p className="status" role="status">Operation {lastReceipt.status}. Cost ${lastReceipt.costUsd.toFixed(2)}.</p>}
    <div className="actions"><button className="primary" disabled={state.matches("executing") || state.matches("persistingReceipt")} onClick={() => { const id = crypto.randomUUID(); send({ type: "EXECUTE", operation: { id, idempotencyKey: id, service: "bedrock-runtime", action: "bedrock:InvokeModel", region: policy.region, resource: "arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-lite-v1:0", resourceTags: { "grillme:managed": "true" }, estimatedCostUsd: 0.01 } }); }}>Invoke controlled model</button><button className="secondary" onClick={() => send({ type: "REVOKE" })}>Revoke lease</button></div>
  </section>;
}
