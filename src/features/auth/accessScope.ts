import type { AuthUser } from "./types";

export type AccessScope = "platform" | "partner" | "factory";

const factoryRoles = new Set(["OWNER", "ADMIN", "MANAGEMENT", "FINANCE", "EMPLOYEE"]);

export function accessScope(user: AuthUser | null): AccessScope | null {
  if (!user || user.status !== "ACTIVE") return null;
  if (user.platformAdmin === true) return "platform";
  if (user.role === "PARTNER_ADMIN") return "partner";
  return factoryRoles.has(user.role) && user.organizationId ? "factory" : null;
}

function within(pathname: string, root: string) {
  return pathname === root || pathname.startsWith(`${root}/`);
}

export function isPlatformAdminPath(pathname: string) {
  return within(pathname, "/saas-admin") || within(pathname, "/admin/load-testing");
}

export function isEmployeePortalPath(pathname: string) {
  return ["/dashboard", "/leave", "/attendance", "/profile", "/help", "/production/my-assignments"].includes(pathname);
}

export function scopeHome(user: AuthUser | null) {
  const scope = accessScope(user);
  return scope === "platform" ? "/saas-admin" : scope === "partner" ? "/partner/whitelabel" : "/dashboard";
}

/** A redirect decision also blocks rendering, before page query hooks mount. */
export function authRedirect(user: AuthUser | null, pathname: string, tallyEnabled: boolean): string | null {
  const scope = accessScope(user);
  if (!scope) return "/login";
  if (scope === "platform") return isPlatformAdminPath(pathname) ? null : scopeHome(user);
  if (scope === "partner") return within(pathname, "/partner") ? null : scopeHome(user);
  if (user?.organizationStatus === "PENDING_APPROVAL") return "/registration-pending";
  if (user?.organizationStatus === "SUSPENDED" || user?.organizationStatus === "TERMINATED") return "/login";
  if (isPlatformAdminPath(pathname) || within(pathname, "/partner")) return "/dashboard";
  if (!tallyEnabled && (pathname === "/gateway" || within(pathname, "/tally"))) return "/dashboard";
  if (user?.role === "EMPLOYEE" && !isEmployeePortalPath(pathname)) return "/dashboard";
  return null;
}
