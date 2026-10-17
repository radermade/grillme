import type { ReleaseAssignment, ReleaseChannel, ReleaseManifest } from "@grillme/domain";
import { parseReleaseManifest } from "@grillme/content";
import type { AuthService } from "./contracts";

const parts = (version: string) => version.split(".").map(Number);
const compare = (left: string, right: string) => { const a = parts(left), b = parts(right); for (let i = 0; i < 3; i += 1) { const difference = (a[i] ?? 0) - (b[i] ?? 0); if (difference) return difference; } return 0; };
const bucket = (stableId: string) => [...stableId].reduce((sum, character) => (sum * 31 + character.charCodeAt(0)) % 100, 0);
export const assignRelease = (source: unknown, stableId: string, currentVersion: string): ReleaseAssignment => {
  const manifest = parseReleaseManifest(source);
  let assignedVersion = currentVersion;
  let action: ReleaseAssignment["action"] = "none";
  if (compare(currentVersion, manifest.minimumSupportedVersion) < 0) { assignedVersion = manifest.version; action = "unsupported"; }
  else if (manifest.status === "rolled-back" && manifest.rollbackVersion && currentVersion !== manifest.rollbackVersion) { assignedVersion = manifest.rollbackVersion; action = "rollback"; }
  else if (manifest.status === "active" && compare(manifest.version, currentVersion) > 0 && bucket(stableId) < manifest.rolloutPercent) { assignedVersion = manifest.version; action = "update"; }
  return { channel: manifest.channel, currentVersion, assignedVersion, action };
};
export interface ReleaseManifestRepository { find(channel: ReleaseChannel): Promise<unknown | null> }
export const createReleaseService = (auth: AuthService, repository: ReleaseManifestRepository) => ({
  async assignment(channel: ReleaseChannel, authorization: string, currentVersion: string) {
    const identity = await auth.authenticate(authorization);
    if (!identity) throw new Error("UNAUTHORIZED");
    const source = await repository.find(channel);
    if (!source) throw new Error("NOT_FOUND");
    return assignRelease(source, identity.userId, currentVersion);
  },
});
export const createMemoryReleaseRepository = (values: ReleaseManifest[]): ReleaseManifestRepository => ({ async find(channel) { return values.find((value) => value.channel === channel) ?? null; } });
