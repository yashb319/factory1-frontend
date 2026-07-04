export type OrganizationPlan = "FREE" | "STARTER" | "GROWTH" | "ENTERPRISE";

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface SaasPlanOption {
  plan: OrganizationPlan;
  label: string;
  employeeLimit: number | null;
  aiPromptLimit: number | null;
  aiPromptWindowMinutes: number;
  aiUnlimited: boolean;
  defaultMonthlyPrice: number;
}

export interface SaasOwner {
  id: string;
  name: string;
  email: string;
  lastLoginAt: string | null;
}

export interface SaasAiUsage {
  totalPrompts: number;
  externalPrompts: number;
  localFallbackPrompts: number;
  quotaLimitedPrompts: number;
  promptsLast24Hours: number;
}

export interface SaasDbUsage {
  totalRecords: number;
  users: number;
  activeUsers: number;
  employees: number;
  inventoryItems: number;
  stockMovements: number;
  products: number;
  productionEntries: number;
  suppliers: number;
  customers: number;
  bills: number;
  importExportJobs: number;
}

export interface SaasFactory {
  organizationId: string;
  name: string;
  email: string | null;
  phone: string | null;
  registeredAt: string;
  lastLoginAt: string | null;
  owner: SaasOwner | null;
  plan: OrganizationPlan;
  planMonthlyPrice: number;
  employeeLimit: number | null;
  aiPromptLimit: number | null;
  aiPromptWindowMinutes: number;
  aiUnlimited: boolean;
  employeeCount: number;
  aiUsage: SaasAiUsage;
  dbUsage: SaasDbUsage;
}

export interface SaasAdminDashboard {
  totalFactories: number;
  totalEmployees: number;
  totalAiPrompts: number;
  totalHostedAiPrompts: number;
  totalDbRecords: number;
  plans: SaasPlanOption[];
  factories: SaasFactory[];
}

export interface SaasFactoryUpdateRequest {
  plan: OrganizationPlan;
  planMonthlyPrice: number;
}

export interface SaasPlanUpdateRequest {
  employeeLimit: number | null;
  aiPromptLimit: number | null;
  aiPromptWindowMinutes: number;
  aiUnlimited: boolean;
  defaultMonthlyPrice: number;
}
