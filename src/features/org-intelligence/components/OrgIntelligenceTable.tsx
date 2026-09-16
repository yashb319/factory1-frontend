"use client";

import { Badge } from "@/components/ui/badge";
import type { OrgDataQualityAlert, OrgPersonNode } from "../types/orgIntelligence.types";
import {
  EMPLOYEE_STATUS_LABEL,
  PRODUCTION_STATE_LABEL,
  departmentLabel,
  formatOrgCurrency,
  nodeHasIssue,
  salaryIssueLabel,
  type FlatOrgNode,
} from "../utils/orgIntelligence.utils";

interface Props {
  flat: FlatOrgNode[];
  currency: string;
  alertsByEmployeeId: Map<string, OrgDataQualityAlert[]>;
  onSelectNode: (node: OrgPersonNode) => void;
}

export function OrgIntelligenceTable({ flat, currency, alertsByEmployeeId, onSelectNode }: Props) {
  if (!flat.length) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border bg-card text-sm text-muted-foreground">
        No employees match the current filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="responsive-table w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2">Employee</th>
            <th className="px-3 py-2">Designation / Department</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Manager</th>
            <th className="px-3 py-2">Monthly Cost</th>
            <th className="px-3 py-2">Reports</th>
            <th className="px-3 py-2">Production</th>
            <th className="px-3 py-2">Issues</th>
          </tr>
        </thead>
        <tbody>
          {flat.map(({ node, depth }) => {
            const salaryIssue = salaryIssueLabel(node.salary.normalizationStatus);
            const hasIssue = nodeHasIssue(node, alertsByEmployeeId) || !node.designation || salaryIssue;

            return (
              <tr
                key={node.employeeId}
                className="cursor-pointer border-b last:border-0 hover:bg-muted/50"
                onClick={() => onSelectNode(node)}
              >
                <td data-label="Employee" className="px-3 py-2">
                  <span style={{ paddingLeft: `${depth * 12}px` }} className="font-medium">
                    {node.name}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">{node.employeeCode}</span>
                </td>
                <td data-label="Designation / Department" className="px-3 py-2">
                  {node.designation || "—"} · {departmentLabel(node.department)}
                </td>
                <td data-label="Status" className="px-3 py-2">
                  <Badge variant="outline">{EMPLOYEE_STATUS_LABEL[node.status]}</Badge>
                </td>
                <td data-label="Manager" className="px-3 py-2">
                  {node.reportingManager?.name ?? "—"}
                </td>
                <td data-label="Monthly Cost" className="px-3 py-2">
                  {formatOrgCurrency(node.salary.monthlyEquivalentCost, currency)}
                </td>
                <td data-label="Reports" className="px-3 py-2">
                  {node.rollup.directReports} direct / {node.rollup.totalReports} total
                </td>
                <td data-label="Production" className="px-3 py-2">
                  {PRODUCTION_STATE_LABEL[node.production.state]}
                </td>
                <td data-label="Issues" className="px-3 py-2">
                  {hasIssue ? <Badge variant="destructive">Attention</Badge> : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
