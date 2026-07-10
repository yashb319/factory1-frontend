export type OrganizationPlan = "FREE" | "STARTER" | "GROWTH" | "BUSINESS" | "ENTERPRISE";

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PublicPlanOption {
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

export interface PublicOffer {
  id: string;
  title: string;
  code: string;
  description?: string | null;
  discountPercent?: number | null;
  validUntil?: string | null;
  active: boolean;
}
