import type { AuthUser, UserRole } from "@/features/auth/types";

export type AppShortcut = {
  key: string;
  title: string;
  tallyHint: string;
  description: string;
  href?: string;
  roles?: UserRole[];
  platformAdminOnly?: boolean;
  opensMenu?: boolean;
};

const allFactoryRoles: UserRole[] = ["OWNER", "ADMIN", "FINANCE", "MANAGEMENT"];
const operationsRoles: UserRole[] = ["OWNER", "ADMIN", "MANAGEMENT"];
const financeRoles: UserRole[] = ["OWNER", "ADMIN", "FINANCE"];

export const appShortcuts: AppShortcut[] = [
  {
    key: "F1",
    title: "Shortcut Help",
    tallyHint: "Help",
    description: "Open this shortcut menu.",
    opensMenu: true,
  },
  {
    key: "F2",
    title: "Dashboard",
    tallyHint: "Date / Period",
    description: "Open the factory or SaaS overview.",
    href: "/dashboard",
    roles: allFactoryRoles,
  },
  {
    key: "F3",
    title: "Company Settings",
    tallyHint: "Company",
    description: "Open organization settings and access.",
    href: "/organization-settings",
    roles: ["OWNER", "ADMIN"],
  },
  {
    key: "F4",
    title: "Inventory",
    tallyHint: "Contra / Stock",
    description: "Open stock, materials and movements.",
    href: "/inventory",
    roles: operationsRoles,
  },
  {
    key: "F5",
    title: "Payroll",
    tallyHint: "Payment",
    description: "Open salary runs and payroll payments.",
    href: "/payroll",
    roles: financeRoles,
  },
  {
    key: "F6",
    title: "Customers",
    tallyHint: "Receipt",
    description: "Open customer records and receivable context.",
    href: "/customers",
    roles: financeRoles,
  },
  {
    key: "F7",
    title: "Attendance",
    tallyHint: "Journal",
    description: "Open daily attendance and adjustments.",
    href: "/attendance",
    roles: operationsRoles,
  },
  {
    key: "F8",
    title: "Sales Voucher",
    tallyHint: "Sales",
    description: "Open billing for sales voucher entry.",
    href: "/billing?type=SALES",
    roles: financeRoles,
  },
  {
    key: "F9",
    title: "Purchase Voucher",
    tallyHint: "Purchase",
    description: "Open billing for purchase voucher entry.",
    href: "/billing?type=PURCHASE",
    roles: financeRoles,
  },
  {
    key: "F11",
    title: "Accounting",
    tallyHint: "Features / Reports",
    description: "Open ledgers, GST reports and receivable/payable context.",
    href: "/accounting",
    roles: financeRoles,
  },
  {
    key: "F10",
    title: "Products",
    tallyHint: "Other Vouchers",
    description: "Open products, BOM and production.",
    href: "/products",
    roles: operationsRoles,
  },
  {
    key: "F12",
    title: "Import / Export",
    tallyHint: "Features",
    description: "Open async import/export history.",
    href: "/import-export",
    roles: ["OWNER", "ADMIN"],
  },
  {
    key: "F2",
    title: "SaaS Dashboard",
    tallyHint: "Date / Period",
    description: "Open the SaaS owner console.",
    href: "/saas-admin",
    roles: ["SAAS_OWNER"],
    platformAdminOnly: true,
  },
];

export function visibleShortcuts(user: AuthUser | null) {
  return appShortcuts.filter((shortcut) => canUseShortcut(shortcut, user));
}

export function canUseShortcut(
  shortcut: AppShortcut,
  user: AuthUser | null
) {
  if (shortcut.opensMenu) {
    return true;
  }

  if (shortcut.platformAdminOnly) {
    return Boolean(user?.platformAdmin);
  }

  if (user?.platformAdmin) {
    return false;
  }

  if (!shortcut.roles?.length) {
    return true;
  }

  return Boolean(user?.role && shortcut.roles.includes(user.role));
}

export const openShortcutsMenuEvent = "factory1:open-shortcuts";
