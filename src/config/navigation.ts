import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarCheck,
  Wallet,
  Package,
  FileText,
  Landmark,
  Truck,
  UserRound,
  User,
  Bot,
  Settings,
  CalendarDays,
  FileSpreadsheet,
  PackageCheck,
  Workflow,
  ShieldCheck,
  BarChart3,
  Megaphone,
  LifeBuoy,
  SlidersHorizontal,
} from "lucide-react";
import type { ComponentType, CSSProperties } from "react";
import type { AuthUser, UserRole } from "@/features/auth/types";
import type { ModuleKey } from "@/config/theme";
import type { FeatureKey } from "@/config/featureGating";

type NavigationItem = {
  title: string;
  href: string;
  icon: ComponentType<{ size?: number; className?: string; style?: CSSProperties }>;
  roles: UserRole[];
  module: ModuleKey;
  platformAdminOnly?: boolean;
  featureKey?: FeatureKey;
};

const allRoles: UserRole[] = ["OWNER", "ADMIN", "EMPLOYEE", "FINANCE", "MANAGEMENT"];
const operationsRoles: UserRole[] = ["OWNER", "ADMIN", "MANAGEMENT"];
const financeRoles: UserRole[] = ["OWNER", "ADMIN", "FINANCE"];
const employeeRoles: UserRole[] = ["EMPLOYEE"];

export const navigationItems: NavigationItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: allRoles, module: "dashboard" },
  { title: "Employees", href: "/employees", icon: Users, roles: operationsRoles, module: "employees" },
  { title: "Attendance", href: "/attendance", icon: CalendarCheck, roles: operationsRoles, module: "attendance" },
  { title: "Leave", href: "/leave", icon: CalendarDays, roles: allRoles, module: "attendance", featureKey: "leave_management" },
  { title: "Payroll", href: "/payroll", icon: Wallet, roles: financeRoles, module: "payroll", featureKey: "payroll" },
  { title: "Inventory", href: "/inventory", icon: Package, roles: operationsRoles, module: "inventory", featureKey: "inventory" },
  {
    title: "Products",
    href: "/products",
    icon: PackageCheck,
    roles: operationsRoles,
    module: "production",
  },
  { title: "Production", href: "/production", icon: Workflow, roles: operationsRoles, module: "production", featureKey: "production_tracking" },
  { title: "Billing", href: "/billing", icon: FileText, roles: financeRoles, module: "sales", featureKey: "billing" },
  { title: "Accounting", href: "/accounting", icon: Landmark, roles: financeRoles, module: "finance", featureKey: "accounting" },
  { title: "Suppliers", href: "/suppliers", icon: Truck, roles: operationsRoles, module: "suppliers" },
  { title: "Customers", href: "/customers", icon: UserRound, roles: financeRoles, module: "customers" },
  { title: "My Leave", href: "/leave", icon: CalendarCheck, roles: employeeRoles, module: "attendance", featureKey: "leave_management" },
  { title: "My Profile", href: "/profile", icon: User, roles: employeeRoles, module: "organization" },
  {
    title: "Import / Export",
    href: "/import-export",
    icon: FileSpreadsheet,
    roles: ["OWNER", "ADMIN"],
    module: "documents",
  },
  { title: "AI Assistant", href: "/ai", icon: Bot, roles: allRoles, module: "aiInsights", featureKey: "ai_assistant" },
  { title: "Help Center", href: "/help", icon: LifeBuoy, roles: allRoles, module: "settings" },
  // { title: "Docs", href: "/docs", icon: BookOpen, roles: allRoles },
  {
    title: "Organization Settings",
    href: "/organization-settings",
    icon: Settings,
    roles: ["OWNER", "ADMIN"],
    module: "organization",
  },
  {
    title: "SaaS Admin",
    href: "/saas-admin",
    icon: ShieldCheck,
    roles: ["SAAS_OWNER"],
    module: "settings",
    platformAdminOnly: true,
  },
  {
    title: "SaaS Insights",
    href: "/saas-admin/insights",
    icon: BarChart3,
    roles: ["SAAS_OWNER"],
    module: "reports",
    platformAdminOnly: true,
  },
  {
    title: "SaaS Marketing",
    href: "/saas-admin/marketing",
    icon: Megaphone,
    roles: ["SAAS_OWNER"],
    module: "notifications",
    platformAdminOnly: true,
  },
  {
    title: "Registered Factories",
    href: "/saas-admin/factories",
    icon: Building2,
    roles: ["SAAS_OWNER"],
    module: "organization",
    platformAdminOnly: true,
  },
  {
    title: "Feature Gating",
    href: "/saas-admin/features",
    icon: SlidersHorizontal,
    roles: ["SAAS_OWNER"],
    module: "settings",
    platformAdminOnly: true,
  },

];

export function canAccessNavigationItem(
  item: NavigationItem,
  user: AuthUser | null
) {
  if (item.platformAdminOnly) {
    return Boolean(user?.platformAdmin);
  }

  if (user?.platformAdmin) {
    return false;
  }

  return !user?.role || item.roles.includes(user.role);
}
