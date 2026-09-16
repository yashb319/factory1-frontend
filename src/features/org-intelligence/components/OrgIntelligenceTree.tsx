"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, TriangleAlert, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { OrgDataQualityAlert, OrgPersonNode } from "../types/orgIntelligence.types";
import {
  EMPLOYEE_STATUS_LABEL,
  EMPLOYMENT_BASIS_LABEL,
  HIERARCHY_ISSUE_LABEL,
  PRODUCTION_STATE_LABEL,
  ROOT_REASON_LABEL,
  departmentLabel,
  formatOrgCurrency,
  nodeHasIssue,
  salaryIssueLabel,
  subtreeMatchesFilters,
  type OrgFilters,
} from "../utils/orgIntelligence.utils";

interface Props {
  roots: OrgPersonNode[];
  currency: string;
  filters: OrgFilters;
  alertsByEmployeeId: Map<string, OrgDataQualityAlert[]>;
  onSelectNode: (node: OrgPersonNode) => void;
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
  depth,
  currency,
  filters,
  alertsByEmployeeId,
  onSelectNode,
  initiallyExpanded,
  expandAll,
}: {
  node: OrgPersonNode;
  depth: number;
  currency: string;
  filters: OrgFilters;
  alertsByEmployeeId: Map<string, OrgDataQualityAlert[]>;
  onSelectNode: (node: OrgPersonNode) => void;
  initiallyExpanded: boolean;
  expandAll: boolean;
}) {
  const [manuallyExpanded, setManuallyExpanded] = useState(initiallyExpanded);

  const filtering = filters.search.trim().length > 0 || filters.department !== "ALL" || filters.status !== "ALL" || filters.issuesOnly;
  const expanded = filtering ? true : manuallyExpanded;

  const visibleChildren = node.children.filter((child) =>
    filtering ? subtreeMatchesFilters(child, filters, alertsByEmployeeId) : true
  );

  const nodeAlerts = alertsByEmployeeId.get(node.employeeId) ?? [];
  const salaryIssue = salaryIssueLabel(node.salary.normalizationStatus);
  const hasWarnings = nodeHasIssue(node, alertsByEmployeeId) || !node.designation || salaryIssue;

  return (
    <li>
      <div
        className={`group flex flex-wrap items-start gap-3 rounded-lg border bg-card p-3 hover:border-primary/40 ${
          hasWarnings ? "border-amber-300" : ""
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

        <button
          type="button"
          className="flex min-w-0 flex-1 flex-col gap-2 text-left"
          onClick={() => onSelectNode(node)}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{node.name}</span>
            <Badge variant="outline">{node.employeeCode}</Badge>
            <Badge variant={statusBadgeVariant(node.status)}>
              {EMPLOYEE_STATUS_LABEL[node.status]}
            </Badge>
            {node.rootReason && (
              <Badge variant="secondary">{ROOT_REASON_LABEL[node.rootReason]}</Badge>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            {node.designation || "No designation"}
            {node.department ? ` · ${departmentLabel(node.department)}` : ""}
            {node.employmentBasis ? ` · ${EMPLOYMENT_BASIS_LABEL[node.employmentBasis]}` : ""}
          </p>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>
              Salary: {node.salary.rate != null ? formatOrgCurrency(node.salary.monthlyEquivalentCost, currency) : "—"}
              {node.salary.rate != null ? "/mo" : ""}
            </span>
            <span>
              Subtree cost: {formatOrgCurrency(node.rollup.subtreeKnownMonthlyPayrollCost, currency)}
              {node.rollup.subtreeUnknownMonthlyCostEmployees > 0
                ? ` (+${node.rollup.subtreeUnknownMonthlyCostEmployees} unknown)`
                : ""}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {node.rollup.directReports} direct · {node.rollup.totalReports} total reports
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{PRODUCTION_STATE_LABEL[node.production.state]}</Badge>

            {node.production.currentAssignments.slice(0, 1).map((assignment) => (
              <Badge key={assignment.assignmentId} variant="secondary">
                {assignment.orderNumber} · {assignment.operationName}
              </Badge>
            ))}
            {node.production.currentAssignments.length > 1 && (
              <Badge variant="secondary">
                +{node.production.currentAssignments.length - 1} more
              </Badge>
            )}

            {node.todayAttendance?.status && (
              <Badge variant="outline">Today: {node.todayAttendance.status.replace("_", " ")}</Badge>
            )}

            {node.currentApprovedLeaves.length > 0 && (
              <Badge variant="outline">On approved leave</Badge>
            )}

            {node.hierarchyIssues.map((issue) => (
              <Badge key={issue} variant="destructive">
                <TriangleAlert className="h-3 w-3" />
                {HIERARCHY_ISSUE_LABEL[issue]}
              </Badge>
            ))}

            {!node.designation && <Badge variant="destructive">Missing designation</Badge>}
            {salaryIssue && <Badge variant="destructive">{salaryIssue}</Badge>}

            {nodeAlerts
              .filter((alert) => alert.code === "OVERLOADED_MANAGER")
              .map((alert, index) => (
                <Badge key={`overloaded-${index}`} variant="destructive">
                  Overloaded manager
                </Badge>
              ))}
          </div>
        </button>
      </div>

      {node.children.length > 0 && expanded && (
        <ul className="mt-2 ml-6 space-y-2 border-l pl-4">
          {visibleChildren.map((child) => (
            <OrgTreeNode
              key={child.employeeId}
              node={child}
              depth={depth + 1}
              currency={currency}
              filters={filters}
              alertsByEmployeeId={alertsByEmployeeId}
              onSelectNode={onSelectNode}
              initiallyExpanded={expandAll}
              expandAll={expandAll}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function OrgIntelligenceTree({
  roots,
  currency,
  filters,
  alertsByEmployeeId,
  onSelectNode,
  expandSignal,
  expandAll,
}: Props) {
  const filtering =
    filters.search.trim().length > 0 ||
    filters.department !== "ALL" ||
    filters.status !== "ALL" ||
    filters.issuesOnly;

  const visibleRoots = useMemo(
    () =>
      roots.filter((root) =>
        filtering ? subtreeMatchesFilters(root, filters, alertsByEmployeeId) : true
      ),
    [roots, filters, filtering, alertsByEmployeeId]
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
          depth={0}
          currency={currency}
          filters={filters}
          alertsByEmployeeId={alertsByEmployeeId}
          onSelectNode={onSelectNode}
          initiallyExpanded={true}
          expandAll={expandAll}
        />
      ))}
    </ul>
  );
}
