export const FEATURE_KEYS = [
  "production_tracking",
  "leave_management",
  "employee_portal_leave_application",
  "employee_portal_work_orders",
  "employee_portal_self_attendance",
  "inventory",
  "billing",
  "accounting",
  "payroll",
  "ai_assistant",
  "product_costing",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  production_tracking: "Production Tracking",
  leave_management: "Leave Management",
  employee_portal_leave_application: "Employee Portal Leave Apply",
  employee_portal_work_orders: "Employee Portal Work Orders",
  employee_portal_self_attendance: "Employee Portal Attendance",
  inventory: "Inventory",
  billing: "Billing",
  accounting: "Accounting",
  payroll: "Payroll",
  ai_assistant: "AI Assistant",
  product_costing: "Product Costing",
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

export const EMPLOYEE_PORTAL_FEATURE_KEYS = [
  "employee_portal_leave_application",
  "employee_portal_work_orders",
  "employee_portal_self_attendance",
] as const satisfies readonly FeatureKey[];

export type EmployeePortalFeatureKey =
  (typeof EMPLOYEE_PORTAL_FEATURE_KEYS)[number];

const EMPLOYEE_PORTAL_PATHS: {
  featureKey: EmployeePortalFeatureKey;
  prefix: string;
}[] = [
  { featureKey: "employee_portal_leave_application", prefix: "/leave" },
  {
    featureKey: "employee_portal_work_orders",
    prefix: "/production/my-assignments",
  },
  {
    featureKey: "employee_portal_self_attendance",
    prefix: "/attendance",
  },
];

export function isEmployeePortalFeatureKey(
  featureKey: FeatureKey | undefined | null
): featureKey is EmployeePortalFeatureKey {
  return EMPLOYEE_PORTAL_FEATURE_KEYS.includes(
    featureKey as EmployeePortalFeatureKey
  );
}

export function featureKeyForPath(
  pathname: string,
  role?: string | null
): FeatureKey | null {
  if (role === "EMPLOYEE") {
    const employeeMatch = EMPLOYEE_PORTAL_PATHS.find(
      ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );

    if (employeeMatch) {
      return employeeMatch.featureKey;
    }
  }

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

export function isEmployeePortalFeatureEnabled(
  enabledFeatures: readonly string[] | undefined | null,
  featureKey: EmployeePortalFeatureKey
): boolean {
  return Boolean(enabledFeatures?.includes(featureKey));
}
