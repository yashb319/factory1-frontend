"use client";

import { useMemo, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGetOrgIntelligenceQuery } from "../api/orgIntelligenceApi";
import {
  DEFAULT_ORG_FILTERS,
  collectDepartments,
  flattenOrgTree,
  hasActiveFilters,
  nodeMatchesFilters,
  type OrgFilters,
} from "../utils/orgIntelligence.utils";
import { OrgIntelligenceFilters } from "./OrgIntelligenceFilters";
import { OrgIntelligenceTree } from "./OrgIntelligenceTree";
import { OrgIntelligenceTable } from "./OrgIntelligenceTable";

interface Props {
  // Fetch/render only when the caller has already confirmed the viewer is
  // OWNER — this component never decides authorization itself, and does
  // not call the endpoint at all until this is true (skip is applied here).
  enabled: boolean;
}

// Embedded within the Employees page as an OWNER-only "Reporting Hierarchy"
// view. Renders only hierarchy-relevant fields sourced from
// GET /api/org-intelligence: identity, designation, department, status,
// reporting manager, direct/total reports, and reporting/data-integrity
// badges (reporting gap/cycle, inactive manager). No salary, payroll,
// production, attendance, leave, KPI, or analytics content is shown here —
// that data is intentionally out of scope for this view.
export function OrgIntelligenceHierarchyView({ enabled }: Props) {
  const { data, error, isLoading, refetch } = useGetOrgIntelligenceQuery(undefined, {
    skip: !enabled,
  });

  const [filters, setFilters] = useState<OrgFilters>(DEFAULT_ORG_FILTERS);
  const [view, setView] = useState<"tree" | "table">("tree");
  const [expandSignal, setExpandSignal] = useState(0);
  const [expandAll, setExpandAll] = useState(false);

  const flat = useMemo(() => (data ? flattenOrgTree(data.roots) : []), [data]);
  const departments = useMemo(() => collectDepartments(flat), [flat]);

  const filteredFlat = useMemo(() => {
    if (!hasActiveFilters(filters)) return flat;
    return flat.filter(({ node }) => nodeMatchesFilters(node, filters));
  }, [flat, filters]);

  const handleFiltersChange = (next: Partial<OrgFilters>) => {
    setFilters((current) => ({ ...current, ...next }));
  };

  if (!enabled) {
    return null;
  }

  return (
    <div className="space-y-4">
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
              ? "Access denied. The reporting hierarchy is owner-only."
              : "Could not load the reporting hierarchy. Please try again."}
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      {data && (
        <>
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
              filters={filters}
              expandSignal={expandSignal}
              expandAll={expandAll}
            />
          ) : (
            <OrgIntelligenceTable flat={filteredFlat} />
          )}
        </>
      )}
    </div>
  );
}
