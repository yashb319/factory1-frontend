"use client";

import { Badge } from "@/components/ui/badge";
import {
  EMPLOYEE_STATUS_LABEL,
  departmentLabel,
  type FlatOrgNode,
} from "../utils/orgIntelligence.utils";

interface Props {
  flat: FlatOrgNode[];
}

export function OrgIntelligenceTable({ flat }: Props) {
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
            <th className="px-3 py-2">Reports To</th>
            <th className="px-3 py-2">Reports</th>
            <th className="px-3 py-2">Reporting Issues</th>
          </tr>
        </thead>
        <tbody>
          {flat.map(({ node, depth }) => (
            <tr key={node.employeeId} className="border-b last:border-0">
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
              <td data-label="Reports To" className="px-3 py-2">
                {node.reportingManager?.name ?? "—"}
              </td>
              <td data-label="Reports" className="px-3 py-2">
                {node.rollup.directReports} direct / {node.rollup.totalReports} total
              </td>
              <td data-label="Reporting Issues" className="px-3 py-2">
                {node.hierarchyIssues.length > 0 ? (
                  <Badge variant="destructive">
                    {node.hierarchyIssues.length > 1
                      ? `${node.hierarchyIssues.length} issues`
                      : "Issue"}
                  </Badge>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
