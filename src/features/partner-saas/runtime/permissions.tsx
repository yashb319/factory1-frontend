"use client";

import { createContext, useContext } from "react";
import type { AuthBootstrap } from "../auth/contracts";
import { runtimeRouteAllowed } from "./policy";

export const RuntimePermissionsContext = createContext<AuthBootstrap | null>(null);

export function useRuntimePermissions() {
  const data = useContext(RuntimePermissionsContext);
  return {
    contextual: data !== null,
    can(method: string, path: string) {
      if (!data) return true;
      const entitlements = data.entitlements;
      return Boolean(entitlements && runtimeRouteAllowed(
        entitlements.runtimeRoutes, entitlements.role, method, path, entitlements.modules, entitlements.moduleDecisions,
      ));
    },
  };
}
