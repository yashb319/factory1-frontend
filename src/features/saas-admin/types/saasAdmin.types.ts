export type OrganizationPlan = "FREE" | "STARTER" | "GROWTH" | "BUSINESS" | "ENTERPRISE";

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
  displayNote?: string | null;
  serviceOfferings?: string | null;
}

export interface SaasOffer {
  id: string;
  title: string;
  code: string;
  description?: string | null;
  discountPercent?: number | null;
  validUntil?: string | null;
  active: boolean;
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
  status?: "ACTIVE" | "SUSPENDED" | "TERMINATED";
  subscriptionEndDate?: string | null;
  serviceTimeMs?: number | null;
  dataVolumeBytes?: number | null;
}

export type OrganizationStatus = "ACTIVE" | "SUSPENDED" | "TERMINATED";

export interface SaasRevenueByPlan {
  plan: OrganizationPlan;
  label: string;
  factoryCount: number;
  mrr: number;
}

export interface SaasTopFactory {
  organizationId: string;
  name: string;
  plan: string;
  records: number;
  employees: number;
}

export interface SaasAdminInsights {
  mrr: number;
  annualRecurringRevenue: number;
  arpu: number;
  activeFactories: number;
  suspendedFactories: number;
  trialFactories: number;
  newFactoriesThisMonth: number;
  upsellOpportunities: number;
  revenueByPlan: SaasRevenueByPlan[];
  topFactoriesByRecords: SaasTopFactory[];
  expiringIn30Days: number;
  expiringIn14Days: number;
  renewals: SaasRenewalAlert[];
  totalServiceTimeMs: number;
  totalDataVolumeBytes: number;
}

export interface SaasRenewalAlert {
  organizationId: string;
  name: string;
  plan: string;
  subscriptionEndDate: string;
  daysLeft: number;
}

export interface SaasMarkPaidRequest {
  months: number;
  paidDate?: string;
}

export interface SaasMarketingRequest {
  subject: string;
  body: string;
}

export interface SaasFactoryStatusRequest {
  status: OrganizationStatus;
}

export interface SaasAdminDashboard {
  totalFactories: number;
  totalEmployees: number;
  totalAiPrompts: number;
  totalHostedAiPrompts: number;
  totalDbRecords: number;
  plans: SaasPlanOption[];
  offers: SaasOffer[];
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
  displayNote?: string | null;
  serviceOfferings?: string | null;
}

export interface SaasOfferRequest {
  title: string;
  code: string;
  description?: string;
  discountPercent?: number;
  validUntil?: string;
  active?: boolean;
}
