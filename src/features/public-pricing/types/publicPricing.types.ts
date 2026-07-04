export type OrganizationPlan = "FREE" | "STARTER" | "GROWTH" | "ENTERPRISE";

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
}
