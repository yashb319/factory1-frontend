"use client";

import {
  BadgeIndianRupee,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  IdCard,
  Users,
  Workflow,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { OrgDataQualityAlert, OrgPersonNode } from "../types/orgIntelligence.types";
import {
  ALERT_CODE_LABEL,
  ATTENDANCE_STATUS_LABEL,
  EMPLOYEE_STATUS_LABEL,
  EMPLOYMENT_BASIS_LABEL,
  HIERARCHY_ISSUE_LABEL,
  PRODUCTION_STATE_LABEL,
  ROOT_REASON_LABEL,
  departmentLabel,
  formatDate,
  formatOrgCurrency,
  salaryIssueLabel,
} from "../utils/orgIntelligence.utils";

interface Props {
  node: OrgPersonNode | null;
  alertsByEmployeeId: Map<string, OrgDataQualityAlert[]>;
  currency: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value?: string | number | null;
}) {
  return (
    <div className="flex gap-3 rounded-lg border bg-muted/30 p-3">
      <div className="mt-0.5 rounded-md bg-background p-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value ?? "—"}</p>
      </div>
    </div>
  );
}

export function OrgIntelligenceDetailsSheet({ node, alertsByEmployeeId, currency, open, onOpenChange }: Props) {
  const nodeAlerts = node ? alertsByEmployeeId.get(node.employeeId) ?? [] : [];
  const salaryIssue = node ? salaryIssueLabel(node.salary.normalizationStatus) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{node?.name ?? "Employee"}</SheetTitle>
        </SheetHeader>

        {node && (
          <div className="space-y-6 px-4 pb-6">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{node.employeeCode}</Badge>
              <Badge>{EMPLOYEE_STATUS_LABEL[node.status]}</Badge>
              {node.employmentBasis && (
                <Badge variant="secondary">{EMPLOYMENT_BASIS_LABEL[node.employmentBasis]}</Badge>
              )}
              {node.rootReason && (
                <Badge variant="secondary">{ROOT_REASON_LABEL[node.rootReason]}</Badge>
              )}
            </div>

            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Identity
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <DetailItem icon={BriefcaseBusiness} label="Designation" value={node.designation} />
                <DetailItem icon={Building2} label="Department" value={departmentLabel(node.department)} />
                <DetailItem
                  icon={Users}
                  label="Reporting Manager"
                  value={node.reportingManager?.name}
                />
                <DetailItem icon={IdCard} label="Employee Code" value={node.employeeCode} />
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Compensation &amp; team cost
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <DetailItem
                  icon={BadgeIndianRupee}
                  label="Monthly Salary Equivalent"
                  value={formatOrgCurrency(node.salary.monthlyEquivalentCost, currency)}
                />
                <DetailItem
                  icon={BadgeIndianRupee}
                  label="Team (Subtree) Monthly Cost"
                  value={formatOrgCurrency(node.rollup.subtreeKnownMonthlyPayrollCost, currency)}
                />
                <DetailItem icon={Users} label="Direct Reports" value={node.rollup.directReports} />
                <DetailItem icon={Users} label="Total Reports" value={node.rollup.totalReports} />
              </div>
              {salaryIssue && (
                <p className="mt-2 text-xs text-destructive">{salaryIssue}</p>
              )}
              {node.rollup.subtreeUnknownMonthlyCostEmployees > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {node.rollup.subtreeUnknownMonthlyCostEmployees} team member(s) have an unresolved
                  monthly cost, excluded from the team cost total above.
                </p>
              )}
            </div>

            <Separator />

            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Current production assignment
              </h4>
              <p className="mb-2 text-sm">{PRODUCTION_STATE_LABEL[node.production.state]}</p>
              {node.production.currentAssignments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No current production assignment.</p>
              ) : (
                <div className="space-y-2">
                  {node.production.currentAssignments.map((assignment) => (
                    <div key={assignment.assignmentId} className="rounded-lg border p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{assignment.orderNumber}</span>
                        <Badge variant="outline">{assignment.assignmentRole}</Badge>
                      </div>
                      <p className="mt-1 text-muted-foreground">
                        {assignment.productName} ({assignment.productCode}) · {assignment.operationName}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Workflow className="h-3 w-3" />
                        {assignment.orderStatus} · Priority {assignment.priority}
                        {assignment.orderDueDate ? ` · Due ${formatDate(assignment.orderDueDate)}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Attendance &amp; leave
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <DetailItem
                  icon={CalendarClock}
                  label="Today's Attendance"
                  value={
                    node.todayAttendance?.status
                      ? ATTENDANCE_STATUS_LABEL[node.todayAttendance.status]
                      : "Not recorded"
                  }
                />
                <DetailItem
                  icon={CalendarClock}
                  label="Approved Leaves (current)"
                  value={node.currentApprovedLeaves.length || "None"}
                />
              </div>
              {node.currentApprovedLeaves.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {node.currentApprovedLeaves.map((leave) => (
                    <li key={leave.leaveRequestId}>
                      {leave.leaveTypeName}: {formatDate(leave.startDate)} – {formatDate(leave.endDate)}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {(node.hierarchyIssues.length > 0 || nodeAlerts.length > 0) && (
              <>
                <Separator />
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Data quality
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {node.hierarchyIssues.map((issue) => (
                      <Badge key={issue} variant="destructive">
                        {HIERARCHY_ISSUE_LABEL[issue]}
                      </Badge>
                    ))}
                    {nodeAlerts.map((alert, index) => (
                      <Badge key={index} variant="destructive">
                        {ALERT_CODE_LABEL[alert.code]}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
