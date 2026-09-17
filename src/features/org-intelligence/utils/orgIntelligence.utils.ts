import type { HierarchyIssue, OrgPersonNode } from "../types/orgIntelligence.types";

export interface FlatOrgNode {
  node: OrgPersonNode;
  depth: number;
  parentId: string | null;
}

// Structural traversal only (depth/parent bookkeeping for the table view) —
// the tree shape itself comes entirely from the backend.
export function flattenOrgTree(roots: OrgPersonNode[]): FlatOrgNode[] {
  const result: FlatOrgNode[] = [];

  function walk(node: OrgPersonNode, depth: number, parentId: string | null) {
    result.push({ node, depth, parentId });
    node.children.forEach((child) => walk(child, depth + 1, node.employeeId));
  }

  roots.forEach((root) => walk(root, 0, null));
  return result;
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

export const HIERARCHY_ISSUE_LABEL: Record<HierarchyIssue, string> = {
  REPORTING_GAP: "Reporting gap",
  REPORTING_CYCLE: "Reporting cycle",
  INACTIVE_MANAGER: "Inactive manager",
};

export interface OrgFilters {
  search: string;
  department: string; // "ALL" or an exact department value (see departmentLabel)
  status: string; // "ALL" or an EmployeeStatus
}

export const DEFAULT_ORG_FILTERS: OrgFilters = {
  search: "",
  department: "ALL",
  status: "ALL",
};

export function departmentLabel(department: string | null): string {
  return department?.trim() || "Unassigned";
}

export function nodeMatchesFilters(node: OrgPersonNode, filters: OrgFilters): boolean {
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

  return true;
}

// A subtree is kept visible in the tree view if the node itself matches, or
// any descendant matches — so a matching employee's ancestors stay visible
// to preserve the reporting path.
export function subtreeMatchesFilters(node: OrgPersonNode, filters: OrgFilters): boolean {
  if (nodeMatchesFilters(node, filters)) return true;
  return node.children.some((child) => subtreeMatchesFilters(child, filters));
}

export function hasActiveFilters(filters: OrgFilters): boolean {
  return (
    filters.search.trim().length > 0 ||
    filters.department !== "ALL" ||
    filters.status !== "ALL"
  );
}

export function collectDepartments(flat: FlatOrgNode[]): string[] {
  const set = new Set<string>();
  flat.forEach(({ node }) => set.add(departmentLabel(node.department)));
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
