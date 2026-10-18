import { z } from "zod";
import type { ManagedConsoleBudget, ManagedConsoleLaunch, ManagedConsoleSession } from "@grillme/domain";
import { labValidationSchema, validationProvenanceSchema } from "./validator";

const id = z.string().min(1).max(200).regex(/^[a-zA-Z0-9:_./-]+$/);
const timestamp = z.iso.datetime({ offset: true });
const money = z.number().finite().min(0).max(10_000);
export const managedConsoleSessionSchema = z.object({ schemaVersion: z.literal(1), id, labSessionId: id, policyId: id, policyVersion: id, status: z.enum(["active", "revoking", "revoked", "expired"]), region: z.string().regex(/^[a-z]{2}-[a-z]+-\d$/), issuedAt: timestamp, expiresAt: timestamp, spendLimitUsd: money, spentUsd: money, provenance: validationProvenanceSchema.extend({ compatibilityId: id, compatibilityVersion: id }).strict() }).strict().superRefine((value, context) => { if (value.spentUsd > value.spendLimitUsd) context.addIssue({ code: "custom", message: "Managed console spend cannot exceed its ceiling." }); });
export const managedConsoleLaunchSchema = z.object({ schemaVersion: z.literal(1), session: managedConsoleSessionSchema, launchUrl: z.url().refine((value) => new URL(value).protocol === "https:", "Launch URL must use HTTPS."), launchExpiresAt: timestamp }).strict().superRefine((value, context) => { if (Date.parse(value.launchExpiresAt) > Date.parse(value.session.expiresAt)) context.addIssue({ code: "custom", message: "Launch URL cannot outlive the managed console session." }); });
export const managedConsoleBudgetSchema = z.object({ schemaVersion: z.literal(1), sessionId: id, spendLimitUsd: money, spentUsd: money, remainingUsd: money, exhausted: z.boolean(), observedAt: timestamp }).strict();
export const managedConsoleValidationSchema = labValidationSchema;
export const parseManagedConsoleSession = (value: unknown): ManagedConsoleSession | null => managedConsoleSessionSchema.safeParse(value).data as ManagedConsoleSession | undefined ?? null;
export const parseManagedConsoleLaunch = (value: unknown): ManagedConsoleLaunch | null => managedConsoleLaunchSchema.safeParse(value).data as ManagedConsoleLaunch | undefined ?? null;
export const parseManagedConsoleBudget = (value: unknown): ManagedConsoleBudget | null => managedConsoleBudgetSchema.safeParse(value).data as ManagedConsoleBudget | undefined ?? null;
export const parseManagedConsoleValidation = (value: unknown) => managedConsoleValidationSchema.safeParse(value).data ?? null;