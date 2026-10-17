export type ReviewDecision = "pending" | "approved" | "changes-required";
export type CourseReleaseManifest = {
  schemaVersion: 1;
  courseId: string;
  courseVersion: string;
  status: "draft" | "review" | "released" | "withdrawn";
  sourceUrls: string[];
  sourceRetrievedAt: string;
  skillIds: string[];
  approvals: {
    product: ReviewDecision;
    technical: ReviewDecision;
    instructional: ReviewDecision;
    accessibility: ReviewDecision;
    lab: ReviewDecision;
  };
  correctionOwner: string | null;
  nextReviewAt: string;
  knownLimitations: string[];
};

export type ContentReportCategory = "technical-error" | "unclear" | "accessibility" | "stale" | "unsafe";
export type ContentReport = {
  schemaVersion: 1;
  id: string;
  idempotencyKey: string;
  courseId: string;
  courseVersion: string;
  contentId: string;
  category: ContentReportCategory;
  summary: string;
  occurredAt: string;
};
export type ContentReportReceipt = { reportId: string; status: "reported"; severity: "critical" | "high" | "normal" };
