export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export type OrganizationPlan = "FREE" | "STARTER" | "GROWTH" | "BUSINESS" | "ENTERPRISE";

export interface PlanOption {
  plan: OrganizationPlan;
  label: string;
  employeeLimit: number | null;
  aiPromptLimit: number | null;
  aiPromptWindowMinutes: number;
  aiUnlimited: boolean;
  defaultMonthlyPrice: number;
  displayNote?: string | null;
  serviceOfferings?: string | null;
}

export interface PlanOffer {
  id: string;
  title: string;
  code: string;
  description?: string | null;
  discountPercent?: number | null;
  validUntil?: string | null;
  active: boolean;
}

export interface OrganizationSettingsRequest {
  workingHoursPerDay: number;
  workingDaysPerMonth: number;
  overtimeMultiplier: number;
  currency: string;
  timezone: string;
  weekStartDay: string;
  financialYearStartMonth: number;
  organizationName: string;
  location?: string;
  city?: string;
  pincode?: string;
  country?: string;
  industryType?: string;
  employeeCountEstimate?: number;
  gstNumber?: string;
  businessType?: string;
  state?: string;
  activeAccountingPeriodStart?: string;
  activeAccountingPeriodEnd?: string;
  accountingMastersEnabled?: boolean;
  accountingVouchersEnabled?: boolean;
  accountingTaxationEnabled?: boolean;
  accountingReportsEnabled?: boolean;
  tdsEnabled?: boolean;
  tcsEnabled?: boolean;
}

export interface OrganizationSettingsResponse
  extends OrganizationSettingsRequest {
  id: string;
  organizationId: string;
  organizationEmail?: string;
  phone?: string;
  attendanceCaptureKey?: string;
  plan: OrganizationPlan;
  planMonthlyPrice: number;
  employeeLimit: number | null;
  aiExternalPromptLimit: number | null;
  aiExternalPromptWindowMinutes: number;
  aiExternalPromptUnlimited: boolean;
  subscriptionStartDate?: string | null;
  subscriptionEndDate?: string | null;
}

export interface PlanChangeRequest {
  requestedPlan: OrganizationPlan;
  note?: string;
}

export interface MessageResponse {
  message: string;
  debug?: Record<string, unknown> | null;
}
