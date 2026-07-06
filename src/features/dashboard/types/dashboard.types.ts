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
