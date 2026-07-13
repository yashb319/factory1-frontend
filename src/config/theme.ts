export const brandColors = {
  primary: "#2563EB",
  primaryHover: "#1D4ED8",
  primaryActive: "#1E40AF",
  primaryLight: "#DBEAFE",
  primaryExtraLight: "#EFF6FF",
  background: "#F8FAFC",
  surface: "#FFFFFF",
  surfaceMuted: "#F1F5F9",
  border: "#E2E8F0",
  borderStrong: "#CBD5E1",
  textPrimary: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#64748B",
  textDisabled: "#94A3B8",
} as const;

export const semanticColors = {
  success: "#16A34A",
  successLight: "#DCFCE7",
  error: "#DC2626",
  errorLight: "#FEE2E2",
  warning: "#F59E0B",
  warningLight: "#FEF3C7",
  info: "#0284C7",
  infoLight: "#E0F2FE",
  draft: "#94A3B8",
  pending: "#EA580C",
  approved: "#16A34A",
  paid: "#10B981",
  cancelled: "#991B1B",
} as const;

export const moduleTheme = {
  dashboard: { color: "#2563EB", light: "#DBEAFE" },
  employees: { color: "#4F46E5", light: "#E0E7FF" },
  attendance: { color: "#0EA5E9", light: "#E0F2FE" },
  payroll: { color: "#10B981", light: "#D1FAE5" },
  inventory: { color: "#F59E0B", light: "#FEF3C7" },
  suppliers: { color: "#F97316", light: "#FFEDD5" },
  customers: { color: "#8B5CF6", light: "#EDE9FE" },
  sales: { color: "#E11D48", light: "#FFE4E6" },
  purchase: { color: "#0D9488", light: "#CCFBF1" },
  production: { color: "#DC2626", light: "#FEE2E2" },
  bom: { color: "#92400E", light: "#FEF3C7" },
  quality: { color: "#22C55E", light: "#DCFCE7" },
  maintenance: { color: "#475569", light: "#E2E8F0" },
  finance: { color: "#334155", light: "#E2E8F0" },
  gst: { color: "#EA580C", light: "#FFEDD5" },
  reports: { color: "#7C3AED", light: "#EDE9FE" },
  aiInsights: { color: "#06B6D4", light: "#CFFAFE" },
  documents: { color: "#78716C", light: "#E7E5E4" },
  assets: { color: "#CA8A04", light: "#FEF9C3" },
  crm: { color: "#DB2777", light: "#FCE7F3" },
  projects: { color: "#6366F1", light: "#E0E7FF" },
  settings: { color: "#6B7280", light: "#F3F4F6" },
  organization: { color: "#1E3A8A", light: "#DBEAFE" },
  notifications: { color: "#FB923C", light: "#FFEDD5" },
  auditLogs: { color: "#475569", light: "#E2E8F0" },
} as const;

export type ModuleKey = keyof typeof moduleTheme;

export function moduleForHref(href?: string | null): ModuleKey {
  if (!href) return "dashboard";
  if (href.startsWith("/employees")) return "employees";
  if (href.startsWith("/attendance")) return "attendance";
  if (href.startsWith("/payroll")) return "payroll";
  if (href.startsWith("/inventory")) return "inventory";
  if (href.startsWith("/suppliers")) return "suppliers";
  if (href.startsWith("/customers")) return "customers";
  if (href.includes("type=SALES")) return "sales";
  if (href.includes("type=PURCHASE")) return "purchase";
  if (href.startsWith("/billing")) return "sales";
  if (href.includes("workspace=TAXES") || href.startsWith("/settings/gst")) return "gst";
  if (href.includes("workspace=REPORTS")) return "reports";
  if (href.startsWith("/accounting")) return "finance";
  if (href.startsWith("/products")) return "production";
  if (href.startsWith("/ai")) return "aiInsights";
  if (href.startsWith("/import-export")) return "documents";
  if (href.startsWith("/organization-settings")) return "organization";
  if (href.startsWith("/saas-admin")) return "settings";
  return "dashboard";
}
