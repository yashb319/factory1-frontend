"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, TriangleAlert, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { OrgPersonNode } from "../types/orgIntelligence.types";
import {
  EMPLOYEE_STATUS_LABEL,
  EMPLOYMENT_BASIS_LABEL,
  HIERARCHY_ISSUE_LABEL,
  departmentLabel,
  subtreeMatchesFilters,
  type OrgFilters,
} from "../utils/orgIntelligence.utils";

interface Props {
  roots: OrgPersonNode[];
  filters: OrgFilters;
  expandSignal: number;
  expandAll: boolean;
}

function statusBadgeVariant(status: OrgPersonNode["status"]) {
  if (status === "ACTIVE") return "default" as const;
  if (status === "ON_LEAVE") return "secondary" as const;
  return "outline" as const;
}

function OrgTreeNode({
  node,
  filters,
  initiallyExpanded,
  expandAll,
}: {
  node: OrgPersonNode;
  filters: OrgFilters;
  initiallyExpanded: boolean;
  expandAll: boolean;
}) {
  const [manuallyExpanded, setManuallyExpanded] = useState(initiallyExpanded);

  const filtering =
    filters.search.trim().length > 0 || filters.department !== "ALL" || filters.status !== "ALL";
  const expanded = filtering ? true : manuallyExpanded;

  const visibleChildren = node.children.filter((child) =>
    filtering ? subtreeMatchesFilters(child, filters) : true
  );

  const hasIssues = node.hierarchyIssues.length > 0;

  return (
    <li>
      <div
        className={`flex flex-wrap items-start gap-3 rounded-lg border bg-card p-3 hover:border-primary/40 ${
          hasIssues ? "border-amber-300" : ""
        }`}
      >
        {node.children.length > 0 ? (
          <button
            type="button"
            aria-label={expanded ? "Collapse" : "Expand"}
            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground hover:bg-muted"
            onClick={() => setManuallyExpanded((current) => !current)}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : (
          <span className="mt-0.5 h-6 w-6 shrink-0" />
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{node.name}</span>
            <Badge variant="outline">{node.employeeCode}</Badge>
            <Badge variant={statusBadgeVariant(node.status)}>
              {EMPLOYEE_STATUS_LABEL[node.status]}
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground">
            {node.designation || "No designation"}
            {node.department ? ` · ${departmentLabel(node.department)}` : ""}
            {node.employmentBasis ? ` · ${EMPLOYMENT_BASIS_LABEL[node.employmentBasis]}` : ""}
          </p>

          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>Reports to: {node.reportingManager?.name ?? "—"}</span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {node.rollup.directReports} direct · {node.rollup.totalReports} total reports
            </span>
          </p>

          {hasIssues && (
            <div className="flex flex-wrap gap-2">
              {node.hierarchyIssues.map((issue) => (
                <Badge key={issue} variant="destructive">
                  <TriangleAlert className="h-3 w-3" />
                  {HIERARCHY_ISSUE_LABEL[issue]}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {node.children.length > 0 && expanded && (
        <ul className="mt-2 ml-6 space-y-2 border-l pl-4">
          {visibleChildren.map((child) => (
            <OrgTreeNode
              key={child.employeeId}
              node={child}
              filters={filters}
              initiallyExpanded={expandAll}
              expandAll={expandAll}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function OrgIntelligenceTree({ roots, filters, expandSignal, expandAll }: Props) {
  const filtering =
    filters.search.trim().length > 0 || filters.department !== "ALL" || filters.status !== "ALL";

  const visibleRoots = roots.filter((root) =>
    filtering ? subtreeMatchesFilters(root, filters) : true
  );

  if (!visibleRoots.length) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border bg-card text-sm text-muted-foreground">
        No employees match the current filters.
      </div>
    );
  }

  return (
    <ul key={expandSignal} className="space-y-2">
      {visibleRoots.map((root) => (
        <OrgTreeNode
          key={root.employeeId}
          node={root}
          filters={filters}
          initiallyExpanded={expandSignal === 0 ? true : expandAll}
          expandAll={expandAll}
        />
      ))}
    </ul>
  );
}
