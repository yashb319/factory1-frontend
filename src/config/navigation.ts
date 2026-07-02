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
} from "lucide-react";

export const navigationItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Employees", href: "/employees", icon: Users },
  { title: "Attendance", href: "/attendance", icon: CalendarCheck },
  { title: "Payroll", href: "/payroll", icon: Wallet },
  { title: "Inventory", href: "/inventory", icon: Package },
  {
    title: "Products & Production",
    href: "/products",
    icon: PackageCheck,
  },
  { title: "Billing", href: "/billing", icon: FileText },
  { title: "Suppliers", href: "/suppliers", icon: Truck },
  { title: "Customers", href: "/customers", icon: UserRound },
  {
    title: "Import / Export",
    href: "/import-export",
    icon: FileSpreadsheet,
  },
  { title: "AI Assistant", href: "/ai", icon: Bot },
  { title: "Organization Settings", href: "/organization-settings", icon: Settings },

];