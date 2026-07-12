export type DashboardSummary = {
  employees: number;
  activeEmployees: number;
  presentToday: number;
  absentToday: number;
  inventoryItems: number;
  lowStockItems: number;
  inventoryValue: number;
  latestPayrollAmount: number;
  latestPayrollPeriod: string;
  customers: number;
  suppliers: number;
  products: number;
  productionEntriesThisMonth: number;
  productionQuantityThisMonth: number;
  bills: number;
  salesThisMonth: number;
  purchasesThisMonth: number;
  rangeFrom?: string;
  rangeTo?: string;
  accountingPeriodStart?: string;
  accountingPeriodEnd?: string;
  isAccountingPeriod?: boolean;
  recentActivity: string[];
  insights: string[];
  setupCompleted: boolean;
  setupItems: DashboardSetupItem[];
};

export type DashboardSetupItem = {
  key: string;
  title: string;
  description: string;
  href: string;
  completed: boolean;
};

export type DashboardTrendBucket = {
  period: string;
  label: string;
  sales: number;
  purchases: number;
  net: number;
};

export type DashboardTrends = {
  buckets: DashboardTrendBucket[];
};
