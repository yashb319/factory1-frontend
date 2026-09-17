import type {
  AlertCode,
  AttendanceStatus,
  HierarchyIssue,
  OrgDataQualityAlert,
  OrgPersonNode,
  ProductionState,
  RootReason,
  SalaryNormalizationStatus,
} from "../types/orgIntelligence.types";

export function formatOrgCurrency(
  amount: number | null | undefined,
  currency: string
): string {
  if (amount === null || amount === undefined) return "—";

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency ?? ""} ${amount.toLocaleString("en-IN")}`.trim();
  }
}

export interface FlatOrgNode {
  node: OrgPersonNode;
  depth: number;
  parentId: string | null;
}

// Structural traversal only (depth/parent bookkeeping for the table and
// layer rollups) — the tree shape itself comes entirely from the backend.
export function flattenOrgTree(roots: OrgPersonNode[]): FlatOrgNode[] {
  const result: FlatOrgNode[] = [];

  function walk(node: OrgPersonNode, depth: number, parentId: string | null) {
    result.push({ node, depth, parentId });
    node.children.forEach((child) => walk(child, depth + 1, node.employeeId));
  }

  roots.forEach((root) => walk(root, 0, null));
  return result;
}

export function buildEmployeeIndex(
  flat: FlatOrgNode[]
): Map<string, OrgPersonNode> {
  const map = new Map<string, OrgPersonNode>();
  flat.forEach(({ node }) => map.set(node.employeeId, node));
  return map;
}

export function buildAlertsByEmployeeId(
  alerts: OrgDataQualityAlert[]
): Map<string, OrgDataQualityAlert[]> {
  const map = new Map<string, OrgDataQualityAlert[]>();

  alerts.forEach((alert) => {
    alert.employeeIds.forEach((id) => {
      const existing = map.get(id) ?? [];
      existing.push(alert);
      map.set(id, existing);
    });
  });

  return map;
}

export const EMPLOYEE_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  ON_LEAVE: "On Leave",
  TERMINATED: "Terminated",
};

export const EMPLOYMENT_BASIS_LABEL: Record<string, string> = {
  FULL_TIME: "Full Time",
  PART_TIME: "Part Time",
  CONTRACT: "Contract",
};

// IDLE means exactly "no current assignment" per the backend contract — it
// is never framed as spare capacity anywhere in this feature.
export const PRODUCTION_STATE_LABEL: Record<ProductionState, string> = {
  ASSIGNED: "Assigned",
  IDLE: "Idle — no current assignment",
  NOT_LINKED_TO_USER: "Not linked to a user account",
  NOT_ACTIVE: "Not active",
};

export const ATTENDANCE_STATUS_LABEL: Record<AttendanceStatus, string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  HALF_DAY: "Half Day",
  PAID_LEAVE: "Paid Leave",
  UNPAID_LEAVE: "Unpaid Leave",
  HOLIDAY: "Holiday",
};

export const HIERARCHY_ISSUE_LABEL: Record<HierarchyIssue, string> = {
  REPORTING_GAP: "Reporting gap",
  REPORTING_CYCLE: "Reporting cycle",
  INACTIVE_MANAGER: "Inactive manager",
};

export const ROOT_REASON_LABEL: Record<RootReason, string> = {
  TOP_LEVEL: "Top level",
  REPORTING_GAP: "Reporting gap (root)",
  CYCLE_BREAK: "Cycle break (root)",
};

export const ALERT_CODE_LABEL: Record<AlertCode, string> = {
  REPORTING_GAP: "Reporting gap",
  INACTIVE_MANAGER: "Inactive manager",
  REPORTING_CYCLE: "Reporting cycle",
  MISSING_DESIGNATION: "Missing designation",
  MISSING_SALARY: "Missing salary",
  OVERLOADED_MANAGER: "Overloaded manager",
};

export function salaryIssueLabel(
  status: SalaryNormalizationStatus
): string | null {
  if (status === "MISSING_SALARY") return "Missing salary";
  if (status === "SETTINGS_UNAVAILABLE") {
    return "Salary unresolved — org settings unavailable";
  }
  return null;
}

export interface OrgFilters {
  search: string;
  department: string; // "ALL" or an exact department value (see collectDepartments)
  status: string; // "ALL" or an EmployeeStatus
  issuesOnly: boolean;
}

export const DEFAULT_ORG_FILTERS: OrgFilters = {
  search: "",
  department: "ALL",
  status: "ALL",
  issuesOnly: false,
};

export function nodeHasIssue(
  node: OrgPersonNode,
  alertsByEmployeeId: Map<string, OrgDataQualityAlert[]>
): boolean {
  return (
    node.hierarchyIssues.length > 0 ||
    (alertsByEmployeeId.get(node.employeeId)?.length ?? 0) > 0
  );
}

export function departmentLabel(department: string | null): string {
  return department?.trim() || "Unassigned";
}

export function nodeMatchesFilters(
  node: OrgPersonNode,
  filters: OrgFilters,
  alertsByEmployeeId: Map<string, OrgDataQualityAlert[]>
): boolean {
  const search = filters.search.trim().toLowerCase();

  if (search) {
    const haystack = `${node.name} ${node.employeeCode} ${node.designation ?? ""}`.toLowerCase();
    if (!haystack.includes(search)) return false;
  }

  if (filters.department !== "ALL" && departmentLabel(node.department) !== filters.department) {
    return false;
  }

  if (filters.status !== "ALL" && node.status !== filters.status) {
    return false;
  }

  if (filters.issuesOnly && !nodeHasIssue(node, alertsByEmployeeId)) {
    return false;
  }

  return true;
}

// A subtree is kept visible in the tree view if the node itself matches, or
// any descendant matches — so a matching employee's ancestors stay visible
// to preserve the reporting path.
export function subtreeMatchesFilters(
  node: OrgPersonNode,
  filters: OrgFilters,
  alertsByEmployeeId: Map<string, OrgDataQualityAlert[]>
): boolean {
  if (nodeMatchesFilters(node, filters, alertsByEmployeeId)) return true;
  return node.children.some((child) =>
    subtreeMatchesFilters(child, filters, alertsByEmployeeId)
  );
}

export function hasActiveFilters(filters: OrgFilters): boolean {
  return (
    filters.search.trim().length > 0 ||
    filters.department !== "ALL" ||
    filters.status !== "ALL" ||
    filters.issuesOnly
  );
}

export function collectDepartments(flat: FlatOrgNode[]): string[] {
  const set = new Set<string>();
  flat.forEach(({ node }) => set.add(departmentLabel(node.department)));
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export interface DepartmentRollup {
  department: string;
  headcount: number;
  knownMonthlyCost: number;
  unknownCostEmployees: number;
}

// Grouping only: sums each node's own authoritative monthlyEquivalentCost by
// department. Does not reuse rollup.subtreeKnownMonthlyPayrollCost, since
// that figure is a hierarchical (manager-down) rollup and would double-count
// across departments if summed per-node.
export function groupByDepartment(flat: FlatOrgNode[]): DepartmentRollup[] {
  const map = new Map<string, DepartmentRollup>();

  flat.forEach(({ node }) => {
    const key = departmentLabel(node.department);
    const existing = map.get(key) ?? {
      department: key,
      headcount: 0,
      knownMonthlyCost: 0,
      unknownCostEmployees: 0,
    };

    existing.headcount += 1;

    if (node.salary.includedInPayrollRollup) {
      if (node.salary.monthlyEquivalentCost != null) {
        existing.knownMonthlyCost += node.salary.monthlyEquivalentCost;
      } else {
        existing.unknownCostEmployees += 1;
      }
    }

    map.set(key, existing);
  });

  return Array.from(map.values()).sort(
    (a, b) => b.knownMonthlyCost - a.knownMonthlyCost
  );
}

export interface LayerRollup {
  depth: number;
  label: string;
  headcount: number;
  knownMonthlyCost: number;
}

// Grouping only: sums each node's own authoritative monthlyEquivalentCost by
// structural depth (layer) in the tree.
export function groupByLayer(flat: FlatOrgNode[]): LayerRollup[] {
  const map = new Map<number, LayerRollup>();

  flat.forEach(({ node, depth }) => {
    const existing = map.get(depth) ?? {
      depth,
      label: `Layer ${depth + 1}`,
      headcount: 0,
      knownMonthlyCost: 0,
    };

    existing.headcount += 1;

    if (
      node.salary.includedInPayrollRollup &&
      node.salary.monthlyEquivalentCost != null
    ) {
      existing.knownMonthlyCost += node.salary.monthlyEquivalentCost;
    }

    map.set(depth, existing);
  });

  return Array.from(map.values()).sort((a, b) => a.depth - b.depth);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", { dateStyle: "medium" });
}
