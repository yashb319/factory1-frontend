"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppSelector } from "@/lib/hook";
import { useGetOrgIntelligenceQuery } from "../api/orgIntelligenceApi";
import type { OrgPersonNode } from "../types/orgIntelligence.types";
import {
  DEFAULT_ORG_FILTERS,
  buildAlertsByEmployeeId,
  buildEmployeeIndex,
  collectDepartments,
  flattenOrgTree,
  formatDateTime,
  groupByDepartment,
  groupByLayer,
  hasActiveFilters,
  nodeMatchesFilters,
  type OrgFilters,
} from "../utils/orgIntelligence.utils";
import { OrgIntelligenceSummaryCards } from "./OrgIntelligenceSummaryCards";
import { OrgIntelligenceAlerts } from "./OrgIntelligenceAlerts";
import { OrgIntelligenceFilters } from "./OrgIntelligenceFilters";
import { OrgIntelligenceTree } from "./OrgIntelligenceTree";
import { OrgIntelligenceTable } from "./OrgIntelligenceTable";
import { OrgIntelligenceInsights } from "./OrgIntelligenceInsights";
import { OrgIntelligenceDetailsSheet } from "./OrgIntelligenceDetailsSheet";

export function OrgIntelligencePage() {
  const router = useRouter();
  const user = useAppSelector((state) => state.auth.user);

  // Role resolution has three states: unknown (user not loaded yet), OWNER,
  // and not-OWNER. No salary data is requested or rendered until the role is
  // confirmed to be OWNER — non-owners are redirected away without ever
  // firing the org-intelligence query.
  const roleResolved = user !== null && user !== undefined;
  const isOwner = roleResolved && user.role === "OWNER";

  const { data, error, isLoading, isFetching, refetch } = useGetOrgIntelligenceQuery(undefined, {
    skip: !isOwner,
  });

  const [filters, setFilters] = useState<OrgFilters>(DEFAULT_ORG_FILTERS);
  const [view, setView] = useState<"tree" | "table">("tree");
  const [expandSignal, setExpandSignal] = useState(0);
  const [expandAll, setExpandAll] = useState(false);
  const [selectedNode, setSelectedNode] = useState<OrgPersonNode | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const flat = useMemo(() => (data ? flattenOrgTree(data.roots) : []), [data]);
  const employeeIndex = useMemo(() => buildEmployeeIndex(flat), [flat]);
  const alertsByEmployeeId = useMemo(
    () => (data ? buildAlertsByEmployeeId(data.alerts) : new Map()),
    [data]
  );
  const departments = useMemo(() => collectDepartments(flat), [flat]);
  const departmentRollups = useMemo(() => groupByDepartment(flat), [flat]);
  const layerRollups = useMemo(() => groupByLayer(flat), [flat]);

  const filteredFlat = useMemo(() => {
    if (!hasActiveFilters(filters)) return flat;
    return flat.filter(({ node }) => nodeMatchesFilters(node, filters, alertsByEmployeeId));
  }, [flat, filters, alertsByEmployeeId]);

  const handleSelectNode = (node: OrgPersonNode) => {
    setSelectedNode(node);
    setSheetOpen(true);
  };

  const handleFiltersChange = (next: Partial<OrgFilters>) => {
    setFilters((current) => ({ ...current, ...next }));
  };

  // Role not resolved yet — render nothing (no salary/org data) while auth
  // state loads.
  if (!roleResolved) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Role resolved and confirmed not OWNER — hard-deny, redirect away. The
  // backend also enforces this with @PreAuthorize("hasRole('OWNER')"), this
  // is a defense-in-depth UI guard.
  if (!isOwner) {
    if (typeof window !== "undefined") {
      router.replace("/dashboard");
    }
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
        <ShieldAlert className="h-6 w-6" />
        <p>Org Intelligence is only available to organization owners.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--factory1-text-primary)] sm:text-2xl">
            Org Intelligence
          </h1>
          <p className="text-sm text-muted-foreground">
            Reporting hierarchy, payroll cost, and current production/attendance signals across the
            organization.
          </p>
        </div>

        {data && (
          <p className="text-xs text-muted-foreground">
            Generated {formatDateTime(data.generatedAt)} · As of{" "}
            {new Date(`${data.asOfDate}T00:00:00`).toLocaleDateString("en-IN", { dateStyle: "medium" })}
          </p>
        )}
      </div>

      {isLoading && (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-8 text-center">
          <ShieldAlert className="h-6 w-6 text-destructive" />
          <p className="text-sm font-medium">
            {"status" in error && error.status === 403
              ? "Access denied. Org Intelligence is owner-only."
              : "Could not load Org Intelligence data. Please try again."}
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      {data && (
        <>
          <OrgIntelligenceSummaryCards summary={data.summary} currency={data.currency} loading={isFetching} />

          <OrgIntelligenceAlerts
            alerts={data.alerts}
            employeeIndex={employeeIndex}
            onSelectEmployee={handleSelectNode}
          />

          <OrgIntelligenceInsights
            departmentRollups={departmentRollups}
            layerRollups={layerRollups}
            currency={data.currency}
          />

          <OrgIntelligenceFilters
            filters={filters}
            onChange={handleFiltersChange}
            departments={departments}
            view={view}
            onViewChange={setView}
          />

          {view === "tree" && (
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setExpandAll(true);
                  setExpandSignal((s) => s + 1);
                }}
              >
                Expand all
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setExpandAll(false);
                  setExpandSignal((s) => s + 1);
                }}
              >
                Collapse all
              </Button>
            </div>
          )}

          {view === "tree" ? (
            <OrgIntelligenceTree
              roots={data.roots}
              currency={data.currency}
              filters={filters}
              alertsByEmployeeId={alertsByEmployeeId}
              onSelectNode={handleSelectNode}
              expandSignal={expandSignal}
              expandAll={expandAll}
            />
          ) : (
            <OrgIntelligenceTable
              flat={filteredFlat}
              currency={data.currency}
              alertsByEmployeeId={alertsByEmployeeId}
              onSelectNode={handleSelectNode}
            />
          )}
        </>
      )}

      <OrgIntelligenceDetailsSheet
        node={selectedNode}
        alertsByEmployeeId={alertsByEmployeeId}
        currency={data?.currency ?? "INR"}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}
