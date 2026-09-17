// Mirrors the subset of the backend contract documented in
// factory1-backend/docs/ORG_INTELLIGENCE_API.md (GET /api/org-intelligence,
// OWNER-only) that is actually rendered by the embedded reporting hierarchy
// view on the Employees page. The backend response also carries salary,
// production, attendance, leave, KPI-summary and data-quality-alert data,
// but this feature intentionally shows only who reports to whom — so those
// fields are omitted here rather than mirrored end-to-end. Backend owns all
// hierarchy/normalization semantics; nothing is recomputed client-side.

export type EmployeeStatus = "ACTIVE" | "INACTIVE" | "ON_LEAVE" | "TERMINATED";
export type EmploymentBasis = "FULL_TIME" | "PART_TIME" | "CONTRACT";

export type HierarchyIssue =
  | "REPORTING_GAP"
  | "REPORTING_CYCLE"
  | "INACTIVE_MANAGER";

export interface OrgManagerSummary {
  employeeId: string;
  employeeCode: string;
  name: string;
  status: EmployeeStatus;
}

export interface OrgRollup {
  directReports: number;
  totalReports: number;
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
  hierarchyIssues: HierarchyIssue[];
  rollup: OrgRollup;
  children: OrgPersonNode[];
}

export interface OrgIntelligenceResponse {
  roots: OrgPersonNode[];
}
