export type RuntimeRoute = { method: string; path: string };
type ReviewedRoute = RuntimeRoute & { features: readonly string[]; roles: readonly string[] };
type ModuleDecision = { key: string; enabled: boolean };

const uuid = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";
const roles = {
  O: ["OWNER"],
  A: ["OWNER", "ADMIN"],
  M: ["OWNER", "ADMIN", "MANAGEMENT"],
  F: ["OWNER", "ADMIN", "FINANCE"],
} as const;

function entries(methods: string, path: string, features: string, role: keyof typeof roles): ReviewedRoute[] {
  return methods.split(",").map((method) => ({ method, path, features: features.split("+"), roles: roles[role] }));
}

// Frozen against backend 6522bfce, docs/partner-runtime-and-onboarding.md.
// The backend's filtered runtimeRoutes is still required for every operation.
export const reviewedRoutes: readonly ReviewedRoute[] = [
  ...entries("GET,POST", "/api/inventory/items", "inventory", "M"),
  ...entries("GET", "/api/inventory/items/next-code", "inventory", "M"),
  ...entries("GET,PUT", "/api/inventory/items/{id}", "inventory", "M"),
  ...entries("DELETE", "/api/inventory/items/{id}", "inventory", "A"),
  ...entries("GET,POST", "/api/inventory/items/{id}/stock-movements", "inventory", "M"),
  ...entries("GET", "/api/inventory/dashboard", "inventory", "M"),
  ...entries("GET,POST", "/api/employees", "payroll", "M"),
  ...entries("GET", "/api/employees/next-code", "payroll", "M"),
  ...entries("GET", "/api/employees/designations", "payroll", "M"),
  ...entries("GET,PUT", "/api/employees/{id}", "payroll", "M"),
  ...entries("DELETE", "/api/employees/{id}", "payroll", "A"),
  ...entries("GET", "/api/attendance", "payroll", "M"),
  ...entries("POST", "/api/attendance", "payroll", "O"),
  ...entries("GET", "/api/attendance/dashboard", "payroll", "M"),
  ...entries("GET", "/api/attendance/report/monthly", "payroll", "M"),
  ...entries("GET", "/api/attendance/leave-status", "payroll+leave_management", "M"),
  ...entries("PUT", "/api/attendance/{employeeId}/{attendanceDate}/correction", "payroll", "O"),
  ...entries("GET,POST", "/api/leave/types", "leave_management", "M"),
  ...entries("PUT,DELETE", "/api/leave/types/{id}", "leave_management", "M"),
  ...entries("GET", "/api/leave/requests/pending", "leave_management", "M"),
  ...entries("GET", "/api/leave/requests/{id}", "leave_management", "M"),
  ...entries("POST", "/api/leave/requests/{id}/approve", "leave_management", "M"),
  ...entries("POST", "/api/leave/requests/{id}/reject", "leave_management", "M"),
  ...entries("POST", "/api/leave/requests/{id}/clarification", "leave_management", "M"),
  ...entries("GET", "/api/leave/requests/{id}/comments", "leave_management", "M"),
  ...entries("GET", "/api/leave/calendar", "leave_management", "M"),
  ...entries("GET,POST", "/api/leave/holidays", "leave_management", "M"),
  ...entries("DELETE", "/api/leave/holidays/{id}", "leave_management", "M"),
  ...entries("GET,POST", "/api/payroll", "payroll", "F"),
  ...entries("GET", "/api/payroll/{id}", "payroll", "F"),
  ...entries("GET", "/api/payroll/dashboard", "payroll", "F"),
  ...entries("PUT", "/api/payroll/{id}/approve", "payroll", "A"),
  ...entries("PUT", "/api/payroll/{id}/pay", "payroll", "F"),
  ...entries("DELETE", "/api/payroll/{id}", "payroll", "A"),
  ...entries("GET", "/api/production/orders", "production_tracking", "M"),
  ...entries("POST", "/api/production/orders", "production_tracking+inventory", "M"),
  ...entries("GET", "/api/production/orders/{orderId}", "production_tracking", "M"),
  ...entries("PUT", "/api/production/orders/{orderId}", "production_tracking+inventory", "M"),
  ...entries("DELETE", "/api/production/orders/{orderId}", "production_tracking+inventory", "A"),
  ...entries("POST", "/api/production/orders/{orderId}/bom-binding", "production_tracking+inventory", "M"),
  ...["start", "pause", "record", "complete"].flatMap((action) =>
    entries("POST", `/api/production/orders/{orderId}/steps/{stepId}/${action}`, "production_tracking+inventory", "M")),
  ...["timeline", "audit-log"].flatMap((suffix) =>
    entries("GET", `/api/production/orders/{orderId}/${suffix}`, "production_tracking", "M")),
  ...entries("GET", "/api/production/orders/progress", "production_tracking", "M"),
  ...entries("GET", "/api/production/analytics", "production_tracking", "M"),
  ...entries("GET", "/api/production/workflows", "production_tracking", "M"),
  ...entries("GET", "/api/production/workflows/{templateId}/versions", "production_tracking", "M"),
  ...entries("GET", "/api/production/workflow-versions/{versionId}", "production_tracking", "M"),
  ...entries("GET", "/api/production/boms", "production_tracking+inventory", "M"),
  ...entries("GET", "/api/production/boms/{bomId}", "production_tracking+inventory", "M"),
  ...["suppliers", "customers"].flatMap((kind) => {
    const feature = kind === "suppliers" ? "inventory" : "billing";
    return [
      ...entries("GET,POST", `/api/${kind}`, feature, "M"),
      ...entries("GET,PUT", `/api/${kind}/{id}`, feature, "M"),
      ...entries("DELETE", `/api/${kind}/{id}`, feature, "A"),
      ...["next-code", "active", "dashboard", "insights"].flatMap((suffix) =>
        entries("GET", `/api/${kind}/${suffix}`, feature, "M")),
    ];
  }),
  ...entries("GET", "/api/billing/bills", "billing", "F"),
  ...entries("POST", "/api/billing/bills", "billing+inventory+accounting", "F"),
  ...entries("GET", "/api/billing/bills/{id}", "billing", "F"),
  ...["cancel", "post"].flatMap((suffix) =>
    entries("PUT", `/api/billing/bills/{id}/${suffix}`, "billing+inventory+accounting", "F")),
  ...entries("PUT", "/api/billing/bills/{id}/payment", "billing+accounting", "F"),
  ...["bills/number-suggestion", "bills/number-availability", "gst-suggestions", "gst-report"].flatMap((suffix) =>
    entries("GET", `/api/billing/${suffix}`, "billing", "F")),
  ...["masters", "tax-sections/catalog", "tax-sections", "ledgers", "vouchers",
    "vouchers/check-voucher-number", "vouchers/suggest-voucher-number", "gst-summary",
    "trial-balance", "profit-loss", "balance-sheet", "aging"].flatMap((suffix) =>
    entries("GET", `/api/accounting/${suffix}`, "accounting", "F")),
  ...entries("POST", "/exports/inventory", "inventory", "M"),
  ...entries("GET", "/exports/inventory/{id}", "inventory", "M"),
  ...entries("GET", "/exports/inventory/{id}/download", "inventory", "M"),
];

function pathPattern(path: string) {
  return path.split("/").map((part) => {
    if (part === "{attendanceDate}") return "\\d{4}-\\d{2}-\\d{2}";
    if (/^\{[A-Za-z]+Id\}$/.test(part) || part === "{id}") return uuid;
    return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }).join("/");
}

export function reviewedRuntimeRoute(method: string, path: string): ReviewedRoute | undefined {
  if (path.includes("%") || path.includes("\\") || path.includes("..")) return undefined;
  return reviewedRoutes.find((route) => route.method === method && new RegExp(`^${pathPattern(route.path)}$`).test(path));
}

export function runtimeRouteAllowed(
  routes: readonly RuntimeRoute[], role: string | null | undefined, method: string, path: string,
  modules: readonly string[], decisions: readonly ModuleDecision[] = [],
) {
  const reviewed = reviewedRuntimeRoute(method, path);
  return Boolean(reviewed && role && reviewed.roles.includes(role) &&
    reviewed.features.every((feature) => modules.includes(feature) &&
      !decisions.some((decision) => decision.key === feature && !decision.enabled)) &&
    routes.some((route) => route.method === method && route.path === reviewed.path));
}

export function runtimeScreens(
  routes: readonly RuntimeRoute[], role: string | null | undefined, modules: readonly string[],
  decisions: readonly ModuleDecision[] = [],
) {
  return [
    { href: "/inventory", label: "Inventory", path: "/api/inventory/items" },
    { href: "/employees", label: "Employees", path: "/api/employees" },
    { href: "/attendance", label: "Attendance", path: "/api/attendance" },
    { href: "/leave", label: "Leave", path: "/api/leave/requests/pending" },
    { href: "/payroll", label: "Payroll", path: "/api/payroll" },
    { href: "/production", label: "Production", path: "/api/production/orders" },
    { href: "/suppliers", label: "Suppliers", path: "/api/suppliers" },
    { href: "/customers", label: "Customers", path: "/api/customers" },
    { href: "/billing", label: "Billing", path: "/api/billing/bills" },
    { href: "/accounting", label: "Accounting reports", path: "/api/accounting/ledgers" },
  ].filter((screen) => runtimeRouteAllowed(routes, role, "GET", screen.path, modules, decisions));
}

export const runtimeQueryKeys = new Set([
  "page", "size", "sortBy", "sortDirection", "search", "category", "itemType",
  "status", "lowStockOnly", "keyword", "department", "employeeId", "fromDate", "toDate",
  "month", "year", "date", "activeOnly", "from", "to", "scope", "productId",
  "workflowId", "type", "asOfDate", "billNumber", "query", "hsnCode", "itemName",
  "orderId", "voucherNumber", "voucherType", "financialYear", "excludeId", "includeArchived",
  "fromMonth", "toMonth", "priority", "workflowTemplateId",
]);

export function runtimeQueryAllowed(params: URLSearchParams, path?: string) {
  const keys = [...params.keys()];
  return keys.length <= 16 && keys.every((key) =>
    runtimeQueryKeys.has(key) && (key !== "productId" || path === "/api/production/boms") &&
    params.getAll(key).length === 1 &&
    (params.get(key)?.length ?? 0) <= 200);
}
