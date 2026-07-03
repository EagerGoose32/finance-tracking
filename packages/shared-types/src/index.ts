import { z } from "zod";

export const FormType = z.enum(["10-K", "10-Q"]);
export type FormType = z.infer<typeof FormType>;

export const ScoreType = z.enum(["piotroski_f", "altman_z", "beneish_m"]);
export type ScoreType = z.infer<typeof ScoreType>;

export const RiskLevel = z.enum(["low", "medium", "high", "incomplete"]);
export type RiskLevel = z.infer<typeof RiskLevel>;

export const AlertType = z.enum([
  "new_filing",
  "material_diff",
  "score_threshold_breach",
]);
export type AlertType = z.infer<typeof AlertType>;

export const CompanySchema = z.object({
  id: z.string(),
  cik: z.string(),
  ticker: z.string(),
  name: z.string(),
});
export type Company = z.infer<typeof CompanySchema>;

export const FilingSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  accessionNumber: z.string(),
  formType: FormType,
  filingDate: z.string(),
  periodOfReport: z.string(),
  fiscalYear: z.number(),
  fiscalPeriod: z.string(),
});
export type Filing = z.infer<typeof FilingSchema>;

export const RedFlagScoreSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  filingId: z.string(),
  scoreType: ScoreType,
  scoreValue: z.number().nullable(),
  riskLevel: RiskLevel,
  fiscalYear: z.number(),
  fiscalPeriod: z.string(),
  computedAt: z.string(),
});
export type RedFlagScore = z.infer<typeof RedFlagScoreSchema>;

export const FilingDiffLineSchema = z.object({
  concept: z.string(),
  priorValue: z.number().nullable(),
  newValue: z.number().nullable(),
  deltaAbs: z.number().nullable(),
  deltaPct: z.number().nullable(),
  materialityFlag: z.boolean(),
});
export type FilingDiffLine = z.infer<typeof FilingDiffLineSchema>;

export const AlertSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  alertType: AlertType,
  referenceId: z.string(),
  title: z.string(),
  message: z.string(),
  severity: RiskLevel,
  isRead: z.boolean(),
  createdAt: z.string(),
});
export type Alert = z.infer<typeof AlertSchema>;

export const WatchlistEntrySchema = z.object({
  company: CompanySchema,
  latestScores: z.array(RedFlagScoreSchema),
  lastFilingDate: z.string().nullable(),
});
export type WatchlistEntry = z.infer<typeof WatchlistEntrySchema>;
