import type { AuthUser } from "@/features/auth/types";

const COSTING_ROLES = new Set(["OWNER", "ADMIN", "FINANCE", "MANAGEMENT"]);
const PROFIT_REFRESH_ROLES = new Set(["OWNER", "ADMIN", "FINANCE"]);
const PRODUCT_OPERATIONS_ROLES = new Set(["OWNER", "ADMIN", "MANAGEMENT"]);

export function canManageProductCosting(user: AuthUser | null | undefined) {
  return Boolean(user && !user.platformAdmin && COSTING_ROLES.has(user.role));
}

export function canManageProductOperations(user: AuthUser | null | undefined) {
  return Boolean(
    user && !user.platformAdmin && PRODUCT_OPERATIONS_ROLES.has(user.role)
  );
}

export function canRefreshProfitRecommendations(
  user: AuthUser | null | undefined
) {
  return Boolean(
    user && !user.platformAdmin && PROFIT_REFRESH_ROLES.has(user.role)
  );
}

export function isProductCostingEnabled(
  enabledFeatures: readonly string[] | undefined | null
) {
  return enabledFeatures
    ? enabledFeatures.includes("product_costing")
    : true;
}
