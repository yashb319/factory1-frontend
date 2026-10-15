export type RuntimeRoute = { method: string; path: string };

const uuid = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";
const operationsRoles = new Set(["OWNER", "ADMIN", "MANAGEMENT"]);

// This is deliberately smaller than the legacy API. New routes require review
// on both sides of the confidential adapter, not just a backend feature flag.
const reviewedRoutes: RuntimeRoute[] = [
  ...["/api/inventory/items", "/api/employees"].flatMap((path) => [
    { method: "GET", path }, { method: "POST", path },
    { method: "GET", path: `${path}/next-code` },
    { method: "GET", path: `${path}/{id}` },
    { method: "PUT", path: `${path}/{id}` },
    { method: "DELETE", path: `${path}/{id}` },
  ]),
  { method: "GET", path: "/api/employees/designations" },
  { method: "GET", path: "/api/inventory/dashboard" },
  { method: "GET", path: "/api/inventory/items/{id}/stock-movements" },
  { method: "POST", path: "/api/inventory/items/{id}/stock-movements" },
];

export function reviewedRuntimeRoute(method: string, path: string): RuntimeRoute | undefined {
  if (path.includes("%") || path.includes("\\") || path.includes("..")) return undefined;
  return reviewedRoutes.find((route) => route.method === method &&
    new RegExp(`^${route.path.replace("{id}", uuid)}$`).test(path));
}

export function runtimeRouteAllowed(
  routes: readonly RuntimeRoute[], role: string | null | undefined, method: string, path: string,
  modules: readonly string[],
) {
  const reviewed = reviewedRuntimeRoute(method, path);
  return Boolean(reviewed && role && operationsRoles.has(role) &&
    modules.includes(path.startsWith("/api/inventory/") ? "inventory" : "payroll") &&
    (method !== "DELETE" || role === "OWNER" || role === "ADMIN") &&
    routes.some((route) => route.method === method && route.path === reviewed.path));
}

export function runtimeScreens(routes: readonly RuntimeRoute[], role: string | null | undefined, modules: readonly string[]) {
  return [
    { href: "/inventory", label: "Inventory", path: "/api/inventory/items" },
    { href: "/employees", label: "Employees", path: "/api/employees" },
  ].filter((screen) => runtimeRouteAllowed(routes, role, "GET", screen.path, modules));
}

export const runtimeQueryKeys = new Set([
  "page", "size", "sortBy", "sortDirection", "search", "category", "itemType",
  "status", "lowStockOnly", "keyword", "department",
]);

export function runtimeQueryAllowed(params: URLSearchParams) {
  const keys = [...params.keys()];
  return keys.length <= 16 && keys.every((key) =>
    runtimeQueryKeys.has(key) && params.getAll(key).length === 1 &&
    (params.get(key)?.length ?? 0) <= 200);
}
