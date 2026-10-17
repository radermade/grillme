import type { EvaluationRequest, EvaluationResult, GrillPrompt } from "@grillme/domain";

export type AuthContext = { userId: string };
export type EvaluationEnvelope = {
  authorization: string;
  requestId: string;
  request: EvaluationRequest;
};
export type EvaluationResponse = {
  requestId: string;
  result: EvaluationResult;
  fallbackUsed: boolean;
};

export interface AuthService {
  authenticate(authorization: string): Promise<AuthContext | null>;
}
export interface QuotaService {
  reserve(input: { userId: string; requestId: string; units: number }): Promise<boolean>;
  commit(input: { userId: string; requestId: string; units: number }): Promise<void>;
  release(input: { userId: string; requestId: string }): Promise<void>;
}
export interface RubricRepository {
  findPrompt(input: { promptId: string; rubricId: string; rubricVersion: string }): Promise<GrillPrompt | null>;
}
export interface ModelEvaluationProvider {
  readonly id: string;
  readonly version: string;
  readonly modelVersion: string;
  evaluate(input: { request: EvaluationRequest; prompt: GrillPrompt }, signal: AbortSignal): Promise<unknown>;
}
export type EvaluationAuditEvent = {
  requestId: string;
  userId: string;
  promptId: string;
  rubricId: string;
  outcome: "provider" | "fallback" | "unauthorized" | "quota-rejected" | "invalid-request";
  attempts: number;
  costUnits: number;
  durationMs: number;
};
export interface AuditService { record(event: EvaluationAuditEvent): Promise<void> }
export interface EvaluationClock { nowMs(): number }

export type EvaluationServiceDependencies = {
  auth: AuthService;
  quota: QuotaService;
  rubrics: RubricRepository;
  provider: ModelEvaluationProvider;
  audit: AuditService;
  clock: EvaluationClock;
  timeoutMs: number;
  maxAttempts: number;
  maxCostUnits: number;
  maxResponseLength: number;
};

export class EvaluationServiceError extends Error {
  constructor(
    readonly code: "INVALID_REQUEST" | "UNAUTHORIZED" | "QUOTA_EXCEEDED" | "RUBRIC_NOT_FOUND",
    message: string,
  ) {
    super(message);
    this.name = "EvaluationServiceError";
  }
}