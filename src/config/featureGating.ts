export const FEATURE_KEYS = [
  "production_tracking",
  "leave_management",
  "inventory",
  "billing",
  "accounting",
  "payroll",
  "ai_assistant",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  production_tracking: "Production Tracking",
  leave_management: "Leave Management",
  inventory: "Inventory",
  billing: "Billing",
  accounting: "Accounting",
  payroll: "Payroll",
  ai_assistant: "AI Assistant",
};

const FEATURE_PATH_PREFIXES: { featureKey: FeatureKey; prefix: string }[] = [
  { featureKey: "production_tracking", prefix: "/production" },
  { featureKey: "leave_management", prefix: "/leave" },
  { featureKey: "inventory", prefix: "/inventory" },
  { featureKey: "billing", prefix: "/billing" },
  { featureKey: "accounting", prefix: "/accounting" },
  { featureKey: "payroll", prefix: "/payroll" },
  { featureKey: "ai_assistant", prefix: "/ai" },
];

export function featureKeyForPath(pathname: string): FeatureKey | null {
  const match = FEATURE_PATH_PREFIXES.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  return match?.featureKey ?? null;
}

export function isFeatureEnabled(
  enabledFeatures: readonly string[] | undefined | null,
  featureKey: FeatureKey | undefined | null
): boolean {
  if (!featureKey) return true;

  // Fail open while the org feature set is still loading or unavailable so a
  // transient fetch failure never locks users out of the app.
  if (!enabledFeatures) return true;

  return enabledFeatures.includes(featureKey);
}
