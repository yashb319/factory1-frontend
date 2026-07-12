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
    title: "Date / Period",
    tallyHint: "Date",
    description: "Focus the voucher date or accounting period on voucher screens.",
    roles: allFactoryRoles,
  },
  {
    key: "F3",
    title: "Company",
    tallyHint: "Company",
    description: "Open company and organization settings.",
    href: "/organization-settings",
    roles: ["OWNER", "ADMIN"],
  },
  {
    key: "F4",
    title: "Contra Voucher",
    tallyHint: "Contra",
    description: "Open contra voucher entry.",
    href: "/accounting?voucher=CONTRA",
    roles: financeRoles,
  },
  {
    key: "F5",
    title: "Payment Voucher",
    tallyHint: "Payment",
    description: "Open payment voucher entry.",
    href: "/accounting?voucher=PAYMENT",
    roles: financeRoles,
  },
  {
    key: "F6",
    title: "Receipt Voucher",
    tallyHint: "Receipt",
    description: "Open receipt voucher entry.",
    href: "/accounting?voucher=RECEIPT",
    roles: financeRoles,
  },
  {
    key: "F7",
    title: "Journal Voucher",
    tallyHint: "Journal",
    description: "Open journal voucher entry.",
    href: "/accounting?voucher=JOURNAL",
    roles: financeRoles,
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
    key: "F10",
    title: "Other Vouchers",
    tallyHint: "Other Vouchers",
    description: "Open debit and credit note voucher entry.",
    href: "/accounting?voucher=DEBIT_NOTE",
    roles: financeRoles,
  },
  {
    key: "F11",
    title: "Features",
    tallyHint: "Features",
    description: "Open accounting features and reports.",
    href: "/accounting?workspace=REPORTS",
    roles: financeRoles,
  },
  {
    key: "F12",
    title: "Configure",
    tallyHint: "Configure",
    description: "Open company configuration.",
    href: "/organization-settings",
    roles: ["OWNER", "ADMIN"],
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
