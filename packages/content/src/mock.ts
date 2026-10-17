import { z } from "zod";
import type { MockDefinition, MockEvidenceEvent, MockProgress } from "@grillme/domain";

const id = z.string().min(1).max(200).regex(/^[a-z0-9-]+$/);
const timestamp = z.iso.datetime({ offset: true });
const choice = z.object({ id, label: z.string().min(1).max(500) }).strict();
export const mockSchema = z.object({ schemaVersion: z.literal(1), id, version: z.string().min(1).max(50), courseId: id, courseVersion: z.string().min(1).max(50), title: z.string().min(1).max(200), description: z.string().min(1).max(2_000), durationMinutes: z.number().int().min(5).max(240), items: z.array(z.object({ id, skillIds: z.array(id).min(1).max(10), prompt: z.string().min(1).max(2_000), choices: z.array(choice).min(2).max(10), correctChoiceId: id, rationale: z.string().min(1).max(2_000) }).strict()).min(1).max(100) }).strict().superRefine((mock, context) => { for (const item of mock.items) if (!item.choices.some(({ id }) => id === item.correctChoiceId)) context.addIssue({ code: "custom", message: "Correct choice must exist." }); });
export const mockProgressSchema = z.object({ schemaVersion: z.literal(1), mockId: id, mockVersion: z.string(), sessionId: id, currentIndex: z.number().int().min(0).max(100), startedAt: timestamp, expiresAt: timestamp, responses: z.array(z.object({ itemId: id, choiceId: id, correct: z.boolean(), elapsedMs: z.number().int().nonnegative() }).strict()).max(100), updatedAt: timestamp }).strict();
export const mockEvidenceSchema = z.object({ schemaVersion: z.literal(1), id, idempotencyKey: id, type: z.literal("mock.completed"), courseId: id, courseVersion: z.string(), mockId: id, mockVersion: z.string(), sessionId: id, skillScores: z.record(id, z.number().min(0).max(1)), occurredAt: timestamp }).strict();
export const parseMock = (value: unknown): MockDefinition => mockSchema.parse(value) as MockDefinition;
export const parseMockProgress = (value: unknown): MockProgress | null => mockProgressSchema.safeParse(value).data ?? null;
export const parseMockEvidence = (value: unknown): MockEvidenceEvent[] => z.array(mockEvidenceSchema).max(100).safeParse(value).data ?? [];
