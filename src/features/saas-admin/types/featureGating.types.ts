import type { OrganizationPlan, OrganizationStatus } from "./saasAdmin.types";

export type FeatureSource = "TIER_DEFAULT" | "OVERRIDE" | "DEFAULT_POLICY";

export interface FeatureCatalogItem {
  key: string;
  label: string;
  description: string;
}

export interface OrganizationFeatureSummary {
  organizationId: string;
  name: string;
  status: OrganizationStatus;
  plan: OrganizationPlan;
  enabledFeatures: string[];
}

export interface OrganizationFeatureState {
  key: string;
  enabled: boolean;
  source: FeatureSource;
  overrideReason: string | null;
  overrideUpdatedAt: string | null;
}

export interface OrganizationFeatureDetail {
  organizationId: string;
  name: string;
  plan: OrganizationPlan;
  features: OrganizationFeatureState[];
}

export interface FeatureOverrideRequest {
  enabled: boolean;
  reason: string;
}
