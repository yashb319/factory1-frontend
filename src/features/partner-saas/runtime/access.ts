import type { AuthBootstrap } from "../auth/contracts";
import { runtimeScreens } from "./policy";

export function hasOperationalAccess(data: Pick<AuthBootstrap, "session" | "entitlements">) {
  const { session, entitlements } = data;
  const principal = session.principal;
  const context = session.context;
  return Boolean(session.operationalAccess && entitlements?.operationalAccess && entitlements.ready &&
    Date.parse(session.expiresAt) > Date.now() && context && principal &&
    principal.organizationStatus === "ACTIVE" && principal.organizationId === context.organizationId &&
    entitlements.organizationId === context.organizationId && entitlements.productId === context.productId &&
    session.contextGeneration && session.contextGeneration === entitlements.contextGeneration &&
    principal.role === entitlements.role && runtimeScreens(entitlements.runtimeRoutes, principal.role, entitlements.modules).length);
}
