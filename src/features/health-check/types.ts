export type HealthCheckArea =
  | "EMPLOYEE"
  | "PRODUCTION"
  | "INVENTORY"
  | "FINANCE"
  | "REPORTING"
  | "FULL_FACTORY";

export type HealthCheckPriority =
  | "HIGH_OPPORTUNITY"
  | "MEDIUM_OPPORTUNITY"
  | "EARLY_STAGE"
  | "NO_FOLLOW_UP";

export type FollowUpPreference = "EMAIL" | "PHONE" | "WHATSAPP" | "NO_FOLLOW_UP";
export type HealthCheckAnswerValue = string;

export type HealthCheckContact = {
  name: string;
  email: string;
  phone: string;
  companyName: string;
  location: string;
};

export type HealthCheckAnswer = {
  questionId: string;
  value: string;
};

export type HealthCheckProjectionInputs = {
  workingDaysPerMonth: number;
};

export type HealthCheckProjectionInputDraft = {
  workingDaysPerMonth: string;
};

export type SavingsRange = {
  min: number;
  max: number;
};

export type HealthCheckSavingsModule = {
  area: Exclude<HealthCheckArea, "FULL_FACTORY">;
  moduleName: string;
  reason: string;
  evidence: string[];
  baselineManualHoursPerMonth: SavingsRange;
  estimatedHoursSavedPerMonth: SavingsRange;
  valueStatement: string | null;
  /** @deprecated Kept only so historical result payloads remain readable. */
  estimatedMonthlyCostSavedInr: SavingsRange | null;
  /** @deprecated Kept only so historical result payloads remain readable. */
  estimatedMonthlyWasteLeakageReductionInr: SavingsRange | null;
  confidence: "LOW" | "MEDIUM";
  dataQuality: "DIRECTIONAL_SELF_REPORTED";
};

export type HealthCheckSavingsProjection = {
  modelVersion: "1.0.0" | "3.0.0";
  /** @deprecated Kept only so historical result payloads remain readable. */
  currency: "INR" | null;
  /** @deprecated Kept only so historical result payloads remain readable. */
  costBasis: "PRODUCTIVITY_COST_EQUIVALENT" | null;
  factorySizeBand: "MICRO" | "SMALL" | "MEDIUM" | "LARGE";
  assumptions: HealthCheckProjectionInputs & {
    realizationFactor: SavingsRange;
    /** @deprecated Kept only so historical result payloads remain readable. */
    loadedHourlyLabourCostInr: number | null;
  };
  modules: HealthCheckSavingsModule[];
  overall: {
    estimatedHoursSavedMonthly: SavingsRange;
    estimatedHoursSavedYearly: SavingsRange;
    /** @deprecated Kept only so historical result payloads remain readable. */
    estimatedCostSavedMonthlyInr: SavingsRange | null;
    /** @deprecated Kept only so historical result payloads remain readable. */
    estimatedCostSavedYearlyInr: SavingsRange | null;
  };
  disclaimer: string;
};

export type CreateHealthCheckDraftRequest = {
  contact: Omit<HealthCheckContact, "location"> & { location?: string };
  followUpPreference: FollowUpPreference;
  idempotencyKey: string;
  website: "";
};

export type UpdateHealthCheckDraftRequest = {
  schemaVersion: "2026-10-04";
  answers: HealthCheckAnswer[];
  followUpPreference: FollowUpPreference;
  expectedRevision: number;
  projectionInputs?: HealthCheckProjectionInputs;
};

export type HealthCheckRemoteDraft = {
  draftId: string;
  draftToken: string;
  status: "DRAFT";
  revision: number;
  createdAt: string;
  updatedAt: string;
};

export type HealthCheckResult = {
  primaryArea: HealthCheckArea;
  priority: HealthCheckPriority;
  recommendedModules: string[];
  secondaryAreas: HealthCheckArea[];
  keyFindings: string[];
  explanation: string;
  savingsProjection: HealthCheckSavingsProjection | null;
};

export type FinalizeHealthCheckDraftResult = {
  status: "FINALIZED";
  result: HealthCheckResult & { resultToken: string };
};

export type HealthCheckDraft = {
  version: number;
  step: number;
  answers: Record<string, string>;
  contact: HealthCheckContact;
  projectionInputs: HealthCheckProjectionInputDraft;
  idempotencyKey: string;
  formStartedAtEpochMs: number;
  remoteDraft?: HealthCheckRemoteDraft;
};

export type HealthCheckLeadStatus =
  | "NEW"
  | "CONTACTED"
  | "QUALIFIED"
  | "NOT_INTERESTED"
  | "CONVERTED";

export type HealthCheckLeadSummary = {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  phone: string;
  companyName: string;
  location: string | null;
  consentToContact: boolean;
  followUpPreference: FollowUpPreference;
  primaryArea: HealthCheckArea;
  priority: HealthCheckPriority;
  status: HealthCheckLeadStatus;
  assignedTo?: string | null;
  followUpAt?: string | null;
};

export type HealthCheckLeadDetail = {
  id: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: string;
  contact: Omit<HealthCheckContact, "location"> & { location: string | null };
  consentToContact: boolean;
  followUpPreference: FollowUpPreference;
  answers: HealthCheckAnswer[];
  engineVersion: string;
  primaryArea: HealthCheckArea;
  priority: HealthCheckPriority;
  result: HealthCheckResult;
  status: HealthCheckLeadStatus;
  notes?: string | null;
  assignedTo?: string | null;
  followUpAt?: string | null;
};

export type HealthCheckLeadFilters = {
  page: number;
  size: number;
  sortBy: string;
  sortDirection: "ASC" | "DESC";
  query?: string;
  priority?: HealthCheckPriority;
  primaryArea?: HealthCheckArea;
  status?: HealthCheckLeadStatus;
  createdFrom?: string;
  createdTo?: string;
  consent?: boolean;
};

export type UpdateHealthCheckLead = {
  status: HealthCheckLeadStatus;
  notes?: string;
  assignedTo?: string;
  followUpAt?: string | null;
};
