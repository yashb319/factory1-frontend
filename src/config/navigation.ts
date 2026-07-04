import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  Wallet,
  Package,
  FileText,
  Truck,
  UserRound,
  Bot,
  Settings,
  FileSpreadsheet,
  PackageCheck,
  ShieldCheck,
} from "lucide-react";
import type { ComponentType } from "react";
import type { AuthUser, UserRole } from "@/features/auth/types";

type NavigationItem = {
  title: string;
  href: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  roles: UserRole[];
  platformAdminOnly?: boolean;
};

const allRoles: UserRole[] = ["OWNER", "ADMIN", "FINANCE", "MANAGEMENT"];
const operationsRoles: UserRole[] = ["OWNER", "ADMIN", "MANAGEMENT"];
const financeRoles: UserRole[] = ["OWNER", "ADMIN", "FINANCE"];

export const navigationItems: NavigationItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: allRoles },
  { title: "Employees", href: "/employees", icon: Users, roles: operationsRoles },
  { title: "Attendance", href: "/attendance", icon: CalendarCheck, roles: operationsRoles },
  { title: "Payroll", href: "/payroll", icon: Wallet, roles: financeRoles },
  { title: "Inventory", href: "/inventory", icon: Package, roles: operationsRoles },
  {
    title: "Products & Production",
    href: "/products",
    icon: PackageCheck,
    roles: operationsRoles,
  },
  { title: "Billing", href: "/billing", icon: FileText, roles: financeRoles },
  { title: "Suppliers", href: "/suppliers", icon: Truck, roles: operationsRoles },
  { title: "Customers", href: "/customers", icon: UserRound, roles: financeRoles },
  {
    title: "Import / Export",
    href: "/import-export",
    icon: FileSpreadsheet,
    roles: ["OWNER", "ADMIN"],
  },
  { title: "AI Assistant", href: "/ai", icon: Bot, roles: allRoles },
  {
    title: "Organization Settings",
    href: "/organization-settings",
    icon: Settings,
    roles: ["OWNER", "ADMIN"],
  },
  {
    title: "SaaS Admin",
    href: "/saas-admin",
    icon: ShieldCheck,
    roles: ["SAAS_OWNER"],
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
