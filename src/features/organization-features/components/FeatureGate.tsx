"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  FEATURE_LABELS,
  featureKeyForPath,
  isFeatureEnabled,
} from "@/config/featureGating";
import { useAppSelector } from "@/lib/hook";
import { useGetOrganizationFeaturesQuery } from "../api/organizationFeaturesApi";

type FeatureGateProps = {
  children: React.ReactNode;
};

export function FeatureGate({ children }: FeatureGateProps) {
  const pathname = usePathname();
  const user = useAppSelector((state) => state.auth.user);
  const featureKey = featureKeyForPath(pathname);
  const skip = !featureKey || !user || Boolean(user.platformAdmin);

  const { data, isLoading } = useGetOrganizationFeaturesQuery(undefined, {
    skip,
  });

  if (skip) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-white p-6">
        <p className="text-sm text-slate-500">Loading feature access...</p>
      </div>
    );
  }

  const enabledFeatures = data?.data?.enabledFeatures;

  if (!isFeatureEnabled(enabledFeatures, featureKey)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-full max-w-md rounded-lg border bg-white p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <ShieldX size={22} />
          </div>
          <h1 className="mt-4 text-lg font-semibold">
            This feature is not enabled for your organization
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {FEATURE_LABELS[featureKey]} is not part of your current plan. Reach
            out to your organization owner or Factory1 support to enable it.
          </p>
          <Button asChild className="mt-6">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
