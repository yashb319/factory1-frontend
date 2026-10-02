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

export type FollowUpPreference = "EMAIL" | "PHONE" | "WHATSAPP" | "NONE";
export type HealthCheckAnswerValue = string | string[];

export type HealthCheckContact = {
  name: string;
  email: string;
  phone: string;
  companyName: string;
  city: string;
};

export type HealthCheckAnswer = {
  questionId: string;
  value: HealthCheckAnswerValue;
};

export type HealthCheckSubmission = {
  schemaVersion: number;
  contact: HealthCheckContact;
  answers: HealthCheckAnswer[];
  consentToContact: boolean;
  followUpPreference: FollowUpPreference;
  idempotencyKey: string;
  website?: string;
  startedAt?: string;
};

export type HealthCheckResult = {
  resultToken: string;
  primaryArea: HealthCheckArea;
  priority: HealthCheckPriority;
  recommendedModules: string[];
  secondaryAreas: HealthCheckArea[];
  keyFindings: string[];
  explanation: string;
};

export type HealthCheckDraft = {
  version: number;
  step: number;
  answers: Record<string, HealthCheckAnswerValue>;
  contact: HealthCheckContact;
  consentToContact: boolean;
  followUpPreference: FollowUpPreference;
  idempotencyKey: string;
  startedAt: string;
};

export type HealthCheckLeadStatus =
  | "NEW"
  | "CONTACTED"
  | "QUALIFIED"
  | "CLOSED"
  | "DO_NOT_CONTACT";

export type HealthCheckLeadSummary = {
  id: string;
  createdAt: string;
  contact: HealthCheckContact;
  consentToContact: boolean;
  followUpPreference: FollowUpPreference;
  primaryArea: HealthCheckArea;
  priority: HealthCheckPriority;
  status: HealthCheckLeadStatus;
  nextFollowUpAt?: string | null;
};

export type HealthCheckLeadDetail = HealthCheckLeadSummary & {
  answers: HealthCheckAnswer[];
  result: HealthCheckResult;
  notes?: string | null;
  updatedAt: string;
};

export type HealthCheckLeadFilters = {
  page: number;
  size: number;
  search?: string;
  priority?: HealthCheckPriority;
  area?: HealthCheckArea;
  status?: HealthCheckLeadStatus;
  from?: string;
  to?: string;
};

export type UpdateHealthCheckLead = {
  status: HealthCheckLeadStatus;
  notes?: string;
  nextFollowUpAt?: string | null;
};
