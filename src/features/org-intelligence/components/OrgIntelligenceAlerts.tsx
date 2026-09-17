"use client";

import { AlertTriangle, ChevronRight, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { OrgDataQualityAlert, OrgPersonNode } from "../types/orgIntelligence.types";
import { ALERT_CODE_LABEL } from "../utils/orgIntelligence.utils";

interface Props {
  alerts: OrgDataQualityAlert[];
  employeeIndex: Map<string, OrgPersonNode>;
  onSelectEmployee: (node: OrgPersonNode) => void;
}

const SEVERITY_RANK: Record<OrgDataQualityAlert["severity"], number> = {
  ERROR: 0,
  WARNING: 1,
};

export function OrgIntelligenceAlerts({ alerts, employeeIndex, onSelectEmployee }: Props) {
  if (!alerts.length) {
    return (
      <div className="flex items-center gap-3 rounded-xl border bg-card p-4 text-sm text-muted-foreground">
        <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
        No data quality alerts. Reporting hierarchy, designations, salaries, and manager
        workloads look clean as of the last refresh.
      </div>
    );
  }

  const sorted = [...alerts].sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
  );

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <h3 className="text-sm font-semibold">Alerts ({alerts.length})</h3>
      </div>

      <ul className="max-h-80 divide-y overflow-y-auto">
        {sorted.map((alert, index) => {
          const firstEmployee = alert.employeeIds
            .map((id) => employeeIndex.get(id))
            .find((node): node is OrgPersonNode => Boolean(node));

          return (
            <li
              key={`${alert.code}-${index}`}
              className="flex items-start justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={alert.severity === "ERROR" ? "destructive" : "secondary"}>
                    {alert.severity}
                  </Badge>
                  <span className="text-xs font-medium text-muted-foreground">
                    {ALERT_CODE_LABEL[alert.code]}
                  </span>
                  {alert.employeeIds.length > 1 && (
                    <span className="text-xs text-muted-foreground">
                      · {alert.employeeIds.length} employees
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm">{alert.message}</p>
              </div>

              {firstEmployee && (
                <button
                  type="button"
                  className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
                  onClick={() => onSelectEmployee(firstEmployee)}
                >
                  View
                  <ChevronRight className="h-3 w-3" />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
