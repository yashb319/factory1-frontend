"use client";

import { useAppSelector } from "@/lib/hook";
import { useGetOrganizationFeaturesQuery } from "@/features/organization-features/api/organizationFeaturesApi";
import { canUseProfitAdvisor } from "../lib/profitAdvisor";

export function useProfitAdvisorAccess() {
  const user = useAppSelector((state) => state.auth.user);
  const featuresQuery = useGetOrganizationFeaturesQuery(undefined, {
    skip: !user || Boolean(user.platformAdmin),
  });

  return {
    enabled: canUseProfitAdvisor(
      user,
      featuresQuery.data?.data?.enabledFeatures
    ),
    loading: featuresQuery.isLoading,
  };
}
