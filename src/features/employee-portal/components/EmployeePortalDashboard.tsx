"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  Loader2,
} from "lucide-react";
import type { ComponentType } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  isEmployeePortalFeatureEnabled,
  type EmployeePortalFeatureKey,
} from "@/config/featureGating";
import { useGetOrganizationFeaturesQuery } from "@/features/organization-features/api/organizationFeaturesApi";

type PortalModule = {
  featureKey: EmployeePortalFeatureKey;
  title: string;
  description: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
};

export const EMPLOYEE_PORTAL_MODULES: readonly PortalModule[] = [
  {
    featureKey: "employee_portal_leave_application",
    title: "Leave Apply",
    description: "Request time away and review your leave balances.",
    href: "/leave",
    icon: CalendarDays,
  },
  {
    featureKey: "employee_portal_work_orders",
    title: "Work Orders",
    description: "Review production steps assigned to you.",
    href: "/production/my-assignments",
    icon: ClipboardList,
  },
  {
    featureKey: "employee_portal_self_attendance",
    title: "Attendance",
    description: "See today's status and check in or out.",
    href: "/attendance",
    icon: CalendarCheck,
  },
];

export function enabledEmployeePortalModules(
  enabledFeatures: readonly string[] | undefined | null
) {
  return EMPLOYEE_PORTAL_MODULES.filter((module) =>
    isEmployeePortalFeatureEnabled(enabledFeatures, module.featureKey)
  );
}

export function EmployeePortalDashboard() {
  const featuresQuery = useGetOrganizationFeaturesQuery();
  const modules = enabledEmployeePortalModules(
    featuresQuery.data?.data?.enabledFeatures
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Employee portal</h1>
        <p className="text-sm text-muted-foreground">
          Use the modules enabled by your organization.
        </p>
      </div>

      {featuresQuery.isLoading ? (
        <div className="flex items-center gap-2 rounded-lg border bg-white p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading your portal...
        </div>
      ) : featuresQuery.isError ? (
        <div className="rounded-lg border bg-white p-6">
          <p role="alert" className="text-sm text-destructive">
            We could not load your enabled modules.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => void featuresQuery.refetch()}
          >
            Retry
          </Button>
        </div>
      ) : modules.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => {
            const Icon = module.icon;

            return (
              <Card key={module.featureKey}>
                <CardHeader>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle>{module.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {module.description}
                  </p>
                  <Button asChild variant="outline" className="mt-5">
                    <Link href={module.href}>
                      Open {module.title}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed bg-white p-8 text-center">
          <h2 className="font-semibold">No employee modules are enabled</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Contact your factory owner if you need access to leave, work orders,
            or attendance.
          </p>
        </div>
      )}
    </div>
  );
}
