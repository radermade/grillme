import { useEffect, useMemo } from "react";
import { useMachine } from "@xstate/react";
import { createAuthMachine, createSyncMachine } from "@grillme/machines";
import { useUiRuntime } from "./runtime";

const courseId = "aws-aip-c01";
const courseVersion = "0.1.0";
export function AccountStatus() {
  const { auth, connectivity, platform, sync } = useUiRuntime();
  const authMachine = useMemo(() => createAuthMachine(auth, connectivity, platform.clock), [auth, connectivity, platform.clock]);
  const syncMachine = useMemo(() => createSyncMachine(courseId, courseVersion, platform.storage, sync, connectivity), [connectivity, platform.storage, sync]);
  const [authState, sendAuth] = useMachine(authMachine, {});
  const [syncState, sendSync] = useMachine(syncMachine, {});
  useEffect(() => {
    const callback = auth.callback();
    if (callback) sendAuth({ type: "CALLBACK", ...callback });
  }, [auth, sendAuth]);
  useEffect(() => platform.syncQueue.subscribe((event) => sendSync({ type: "ENQUEUE", event })), [platform.syncQueue, sendSync]);
  useEffect(() => connectivity.subscribe((status) => {
    sendAuth({ type: status === "online" ? "NETWORK_ONLINE" : "NETWORK_OFFLINE" });
    sendSync({ type: status === "online" ? "NETWORK_ONLINE" : "NETWORK_OFFLINE" });
  }), [sendAuth, sendSync]);
  if (authState.matches("checking")) return <p role="status">Checking account…</p>;
  if (authState.matches("signedOut") || authState.matches("expired") || authState.matches("failed")) return <div className="account-status"><span>Studying locally</span><button onClick={() => sendAuth({ type: authState.matches("failed") ? "RETRY" : "SIGN_IN" })}>{authState.matches("failed") ? "Reset sign-in" : "Sign in"}</button></div>;
  const pending = syncState.context.pending.length;
  return <div className="account-status" aria-live="polite">
    <span>{authState.matches("offlineGrace") ? "Offline grace" : authState.context.session?.displayName} · {pending ? `${pending} pending` : "Synchronized"}</span>
    <button disabled={syncState.matches("pushing") || syncState.matches("pulling")} onClick={() => sendSync({ type: "SYNC" })}>Sync</button>
    <button onClick={() => sendAuth({ type: "SIGN_OUT" })}>Sign out</button>
    {syncState.matches("conflict") && <><span role="alert">Progress needs review before it can be authoritative.</span><button onClick={() => sendSync({ type: "RESOLVE_CONFLICTS" })}>Keep server results</button></>}
  </div>;
}
