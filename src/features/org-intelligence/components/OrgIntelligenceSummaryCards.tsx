"use client";

import {
  AlertTriangle,
  Building2,
  CalendarCheck2,
  CalendarClock,
  CalendarX2,
  CircleDollarSign,
  CircleSlash,
  ClipboardList,
  GitBranch,
  UserCheck,
  UserMinus,
  Users,
  UserX,
  Wallet,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { StatCard } from "@/components/cards/StatCard";
import type { OrgIntelligenceSummary } from "../types/orgIntelligence.types";
import { formatOrgCurrency } from "../utils/orgIntelligence.utils";

interface Props {
  summary?: OrgIntelligenceSummary;
  currency: string;
  loading?: boolean;
}

interface CardDef {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
}

export function OrgIntelligenceSummaryCards({ summary, currency, loading }: Props) {
  const count = (input: number | undefined) => (loading ? "…" : String(input ?? 0));

  const sections: { label: string; cards: CardDef[] }[] = [
    {
      label: "Workforce",
      cards: [
        {
          title: "Total Employees",
          value: count(summary?.totalEmployees),
          description: "All employees in this organization",
          icon: Users,
        },
        {
          title: "Active",
          value: count(summary?.activeEmployees),
          description: "Currently active",
          icon: UserCheck,
        },
        {
          title: "On Leave",
          value: count(summary?.onLeaveEmployees),
          description: "Employee status is On Leave",
          icon: CalendarClock,
        },
        {
          title: "Inactive",
          value: count(summary?.inactiveEmployees),
          description: "Inactive employees",
          icon: UserMinus,
        },
        {
          title: "Terminated",
          value: count(summary?.terminatedEmployees),
          description: "Terminated employees",
          icon: UserX,
        },
        {
          title: "Departments",
          value: count(summary?.departments),
          description: "Distinct departments",
          icon: Building2,
        },
        {
          title: "Top Level",
          value: count(summary?.topLevelEmployees),
          description: "No reporting manager stored",
          icon: GitBranch,
        },
        {
          title: "Reporting Gaps",
          value: count(summary?.reportingGapEmployees),
          description: "Manager is outside this organization",
          icon: AlertTriangle,
        },
      ],
    },
    {
      label: "Payroll",
      cards: [
        {
          title: "Known Monthly Payroll Cost",
          value: loading ? "…" : formatOrgCurrency(summary?.knownMonthlyPayrollCost, currency),
          description: "Sum of resolvable monthly salary equivalents",
          icon: CircleDollarSign,
        },
        {
          title: "Unknown Monthly Cost",
          value: count(summary?.employeesWithUnknownMonthlyCost),
          description: "Employees with unresolved monthly salary",
          icon: Wallet,
        },
      ],
    },
    {
      label: "Production",
      cards: [
        {
          title: "Currently Assigned",
          value: count(summary?.employeesWithCurrentAssignments),
          description: "Employees with a current production assignment",
          icon: Workflow,
        },
        {
          title: "Idle",
          value: count(summary?.productionIdleEmployees),
          description: "Active, user-linked employees with no current assignment",
          icon: CircleSlash,
        },
        {
          title: "Current Assignments",
          value: count(summary?.currentProductionAssignments),
          description: "Open production assignments right now",
          icon: ClipboardList,
        },
      ],
    },
    {
      label: "Attendance & Leave",
      cards: [
        {
          title: "Attendance Recorded Today",
          value: count(summary?.todayAttendanceRecorded),
          description: "Records captured for today",
          icon: CalendarCheck2,
        },
        {
          title: "Present Today",
          value: count(summary?.todayPresent),
          description: "Marked present today",
          icon: CalendarCheck2,
        },
        {
          title: "Absent Today",
          value: count(summary?.todayAbsent),
          description: "Marked absent today",
          icon: CalendarX2,
        },
        {
          title: "On Approved Leave",
          value: count(summary?.currentlyOnApprovedLeave),
          description: "Currently on an approved leave",
          icon: CalendarClock,
        },
      ],
    },
    {
      label: "Data Quality",
      cards: [
        {
          title: "Data Quality Alerts",
          value: count(summary?.dataQualityAlerts),
          description: "Reporting, salary and workload issues",
          icon: AlertTriangle,
        },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <div key={section.label}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {section.label}
          </h3>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {section.cards.map((card) => (
              <StatCard
                key={card.title}
                title={card.title}
                value={card.value}
                description={card.description}
                icon={card.icon}
                module="orgIntelligence"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
