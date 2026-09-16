// Mirrors the backend contract documented in
// factory1-backend/docs/ORG_INTELLIGENCE_API.md (GET /api/org-intelligence,
// OWNER-only). Backend owns all hierarchy, normalization, alert, assignment
// and attendance semantics — this feature only renders and groups the
// authoritative values below, it never recomputes them.

export type EmployeeStatus = "ACTIVE" | "INACTIVE" | "ON_LEAVE" | "TERMINATED";
export type EmploymentBasis = "FULL_TIME" | "PART_TIME" | "CONTRACT";
export type SalaryType = "HOURLY" | "DAILY" | "MONTHLY";
export type AttendanceStatus =
  | "PRESENT"
  | "ABSENT"
  | "HALF_DAY"
  | "PAID_LEAVE"
  | "UNPAID_LEAVE"
  | "HOLIDAY";
export type AssignmentRole = "USER" | "OPERATOR" | "SUPERVISOR";
export type ProductionOrderStatus =
  | "PLANNED"
  | "RELEASED"
  | "IN_PROGRESS"
  | "ON_HOLD"
  | "COMPLETED"
  | "PARTIALLY_COMPLETED"
  | "CANCELLED";
export type ProductionOrderPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type RootReason = "TOP_LEVEL" | "REPORTING_GAP" | "CYCLE_BREAK";
export type HierarchyIssue =
  | "REPORTING_GAP"
  | "REPORTING_CYCLE"
  | "INACTIVE_MANAGER";
export type SalaryNormalizationStatus =
  | "AS_IS"
  | "ORG_WORKING_DAYS"
  | "ORG_WORKING_HOURS_AND_DAYS"
  | "MISSING_SALARY"
  | "SETTINGS_UNAVAILABLE";
export type ProductionState =
  | "ASSIGNED"
  | "IDLE"
  | "NOT_LINKED_TO_USER"
  | "NOT_ACTIVE";
export type AlertCode =
  | "REPORTING_GAP"
  | "INACTIVE_MANAGER"
  | "REPORTING_CYCLE"
  | "MISSING_DESIGNATION"
  | "MISSING_SALARY"
  | "OVERLOADED_MANAGER";
export type AlertSeverity = "WARNING" | "ERROR";

export interface OrgIntelligencePayrollAssumptions {
  workingDaysPerMonth: number | null;
  workingHoursPerDay: number | null;
}

export interface OrgIntelligenceSummary {
  totalEmployees: number;
  activeEmployees: number;
  onLeaveEmployees: number;
  inactiveEmployees: number;
  terminatedEmployees: number;
  departments: number;
  topLevelEmployees: number;
  reportingGapEmployees: number;
  employeesWithCurrentAssignments: number;
  productionIdleEmployees: number;
  currentProductionAssignments: number;
  todayAttendanceRecorded: number;
  todayPresent: number;
  todayAbsent: number;
  currentlyOnApprovedLeave: number;
  knownMonthlyPayrollCost: number | null;
  employeesWithUnknownMonthlyCost: number;
  dataQualityAlerts: number;
}

export interface OrgManagerSummary {
  employeeId: string;
  employeeCode: string;
  name: string;
  status: EmployeeStatus;
}

export interface OrgSalaryInfo {
  rate: number | null;
  type: SalaryType | null;
  monthlyEquivalentCost: number | null;
  normalizationStatus: SalaryNormalizationStatus;
  includedInPayrollRollup: boolean;
}

export interface OrgRollup {
  directReports: number;
  totalReports: number;
  subtreeKnownMonthlyPayrollCost: number | null;
  subtreeUnknownMonthlyCostEmployees: number;
}

export interface OrgCurrentAssignment {
  assignmentId: string;
  assignmentRole: AssignmentRole;
  assignedAt: string | null;
  deadline: string | null;
  orderId: string;
  orderNumber: string;
  orderStatus: ProductionOrderStatus;
  priority: ProductionOrderPriority;
  orderDueDate: string | null;
  productId: string;
  productCode: string;
  productName: string;
  operationId: string;
  operationCode: string;
  operationName: string;
  workstation: string | null;
}

export interface OrgProductionInfo {
  state: ProductionState;
  unassigned: boolean;
  idle: boolean;
  currentAssignments: OrgCurrentAssignment[];
}

export interface OrgAttendanceSignal {
  status: AttendanceStatus | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  totalHours: number | null;
  overtimeHours: number | null;
}

export interface OrgApprovedLeaveSignal {
  leaveRequestId: string;
  leaveTypeId: string;
  leaveTypeCode: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
}

export interface OrgPersonNode {
  employeeId: string;
  employeeCode: string;
  name: string;
  designation: string | null;
  department: string | null;
  status: EmployeeStatus;
  employmentBasis: EmploymentBasis | null;
  reportingManager: OrgManagerSummary | null;
  rootReason: RootReason | null;
  hierarchyIssues: HierarchyIssue[];
  salary: OrgSalaryInfo;
  rollup: OrgRollup;
  production: OrgProductionInfo;
  todayAttendance: OrgAttendanceSignal | null;
  currentApprovedLeaves: OrgApprovedLeaveSignal[];
  children: OrgPersonNode[];
}

export interface OrgDataQualityAlert {
  code: AlertCode;
  severity: AlertSeverity;
  employeeIds: string[];
  message: string;
}

export interface OrgIntelligenceResponse {
  generatedAt: string;
  asOfDate: string;
  currency: string;
  payrollAssumptions: OrgIntelligencePayrollAssumptions;
  summary: OrgIntelligenceSummary;
  roots: OrgPersonNode[];
  alerts: OrgDataQualityAlert[];
}
