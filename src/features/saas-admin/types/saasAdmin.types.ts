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

export interface PricingPlanRequest {
  code: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  monthlyPriceFrom: boolean;
  annualPriceFrom: boolean;
  currency: string;
  gstExtra: boolean;
  employeeLimit: number;
  userLimit: number;
  aiPromptLimit: number | null;
  aiPromptWindowMinutes: number | null;
  includedModules: string;
  idealFor: string;
  badge: string | null;
  higherScaleCopy: string;
  active: boolean;
  displayOrder: number;
}

export interface PricingPlan extends PricingPlanRequest {
  id: string;
  plan: string;
  label: string;
  defaultMonthlyPrice: number;
  aiUnlimited: false;
  serviceOfferings?: string | null;
  displayNote?: string | null;
  tag?: string | null;
}

export interface ModuleAddonRequest {
  code: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  currency: string;
  gstExtra: boolean;
  positioningText: string;
  active: boolean;
  displayOrder: number;
}

export interface ModuleAddon extends ModuleAddonRequest {
  id: string;
}

export interface PricingReorderRequest {
  ids: string[];
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
  status?: OrganizationStatus;
  subscriptionEndDate?: string | null;
  serviceTimeMs?: number | null;
  dataVolumeBytes?: number | null;
  deletionStatus?: FactoryDeletionStatus | null;
}

export type OrganizationStatus =
  | "PENDING_APPROVAL"
  | "ACTIVE"
  | "SUSPENDED"
  | "TERMINATED";

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

/**
 * Permanent factory deletion (ROLE_PLATFORM_ADMIN only). Distinct from
 * "terminate" (DELETE /factories/{id}), which only marks the organization
 * TERMINATED and keeps its data. Tenant rows are purged synchronously; the
 * status tracks the follow-up stored-file cleanup.
 */
export type FactoryDeletionStatus =
  | "ASSET_CLEANUP_PENDING"
  | "ASSET_CLEANUP_FAILED"
  | "COMPLETED";

export const PERMANENT_DELETION_CONFIRMATION = "PERMANENTLY DELETE";

export interface FactoryDeletionPreview {
  organizationId: string;
  factoryName: string;
  countsByTable: Record<string, number>;
  countsByModule: Record<string, number>;
  /** Codes such as PROTECTED_ORGANIZATION or SHARED_REFERENCE:<table>. */
  blockers: string[];
  confirmationText: string;
  /** True only when a reviewed retention policy is bound to this factory. */
  realDeletionPolicyConfigured?: boolean;
}

export interface FactoryDeletionRequest {
  factoryName: string;
  confirmation: string;
  dummyDataOnly: boolean;
  /** Required when dummyDataOnly is false. */
  retentionPolicyId?: string;
}

/** Restricted financial/statutory archive kept after a real-factory deletion. */
export interface FactoryDeletionRetention {
  archiveId: string;
  policyId: string;
  jurisdiction: string;
  retainUntil: string;
  legalHold: boolean;
  categories: Record<string, number>;
  integrityHash: string;
}

export interface FactoryDeletionJob {
  organizationId: string;
  status: FactoryDeletionStatus;
  attempts: number;
  errorCode: string | null;
  requestedAt: string | null;
  completedAt: string | null;
  retention?: FactoryDeletionRetention | null;
}
