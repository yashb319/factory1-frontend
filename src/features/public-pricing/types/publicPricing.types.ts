export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PublicPricingPlan {
  id: string;
  code: string;
  plan: string;
  name: string;
  label: string;
  monthlyPrice: number;
  defaultMonthlyPrice: number;
  annualPrice: number;
  monthlyPriceFrom: boolean;
  annualPriceFrom: boolean;
  currency: string;
  gstExtra: boolean;
  employeeLimit: number;
  userLimit: number;
  aiPromptLimit: number | null;
  aiPromptWindowMinutes: number | null;
  aiUnlimited: false;
  includedModules: string;
  serviceOfferings?: string | null;
  idealFor: string;
  displayNote?: string | null;
  badge?: string | null;
  tag?: string | null;
  higherScaleCopy: string;
  active: boolean;
  displayOrder: number;
}

export interface PublicModuleAddon {
  id: string;
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

export interface PublicOffer {
  id: string;
  title: string;
  code: string;
  description?: string | null;
  discountPercent?: number | null;
  validUntil?: string | null;
  active: boolean;
}
