import { containsPotentialSecret } from "@grillme/evaluation";
import { parseContentReport } from "@grillme/content";
import type { ContentReport, ContentReportReceipt } from "@grillme/domain";
import type { AuthService } from "./contracts";

export interface ContentReportStore { append(userId: string, report: ContentReport): Promise<"accepted" | "duplicate"> }
export const createContentReportService = (auth: AuthService, store: ContentReportStore) => ({
  async submit(authorization: string, input: unknown): Promise<ContentReportReceipt> {
    const identity = await auth.authenticate(authorization);
    if (!identity) throw new Error("UNAUTHORIZED");
    const report = parseContentReport(input);
    if (!report || containsPotentialSecret(report.summary)) throw new Error("INVALID_REQUEST");
    await store.append(identity.userId, report);
    return { reportId: report.id, status: "reported", severity: report.category === "unsafe" ? "critical" : report.category === "technical-error" ? "high" : "normal" };
  },
});
export const createMemoryContentReportStore = (): ContentReportStore => {
  const keys = new Set<string>();
  return { async append(userId, report) { const key = `${userId}:${report.idempotencyKey}`; if (keys.has(key)) return "duplicate"; keys.add(key); return "accepted"; } };
};
