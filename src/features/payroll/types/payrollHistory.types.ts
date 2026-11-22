export interface PayrollHistorySummary {
  id: string;
  year: number;
  month: number;
  employeeCount: number;
  importedAt: string;
}

export interface PayrollHistoryRow {
  rowNumber: number;
  employeeCode: string;
  values: Record<string, number>;
}

export interface PayrollHistoryDetail {
  summary: PayrollHistorySummary;
  rows: PayrollHistoryRow[];
}

export interface PayrollHistoryImportRequest {
  year: number;
  month: number;
  rows: Array<{
    rowNumber: number;
    employeeCode: string;
    values: Record<string, number>;
  }>;
}
