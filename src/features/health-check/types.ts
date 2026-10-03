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
  loadedHourlyLabourCostInr: number;
};

export type HealthCheckProjectionInputDraft = {
  workingDaysPerMonth: string;
  loadedHourlyLabourCostInr: string;
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
  estimatedMonthlyCostSavedInr: SavingsRange;
  estimatedMonthlyWasteLeakageReductionInr: null;
  confidence: "LOW" | "MEDIUM";
  dataQuality: "DIRECTIONAL_SELF_REPORTED";
};

export type HealthCheckSavingsProjection = {
  modelVersion: "1.0.0";
  currency: "INR";
  costBasis: "PRODUCTIVITY_COST_EQUIVALENT";
  factorySizeBand: "MICRO" | "SMALL" | "MEDIUM" | "LARGE";
  assumptions: HealthCheckProjectionInputs & {
    realizationFactor: SavingsRange;
  };
  modules: HealthCheckSavingsModule[];
  overall: {
    estimatedHoursSavedMonthly: SavingsRange;
    estimatedHoursSavedYearly: SavingsRange;
    estimatedCostSavedMonthlyInr: SavingsRange;
    estimatedCostSavedYearlyInr: SavingsRange;
  };
  disclaimer: string;
};

export type HealthCheckSubmission = {
  schemaVersion: "2026-10-01";
  contact: HealthCheckContact;
  answers: HealthCheckAnswer[];
  followUpPreference: FollowUpPreference;
  idempotencyKey: string;
  website: "";
  formStartedAtEpochMs: number;
  projectionInputs?: HealthCheckProjectionInputs;
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

export type HealthCheckSubmissionResult = HealthCheckResult & {
  resultToken: string;
};

export type HealthCheckDraft = {
  version: number;
  step: number;
  answers: Record<string, string>;
  contact: HealthCheckContact;
  projectionInputs: HealthCheckProjectionInputDraft;
  idempotencyKey: string;
  formStartedAtEpochMs: number;
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
