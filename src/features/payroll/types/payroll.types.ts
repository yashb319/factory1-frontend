export type PayrollStatus =
  | "DRAFT"
  | "GENERATED"
  | "APPROVED"
  | "PAID"
  | "CANCELLED";

export type SortDirection = "ASC" | "DESC";

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface GeneratePayrollRequest {
  month: number;
  year: number;
}

export interface PayrollRunSummaryResponse {
  id: string;
  payrollMonth: number;
  payrollYear: number;
  status: PayrollStatus;
  totalEmployees: number;
  grossAmount: number;
  overtimeAmount: number;
  deductionAmount: number;
  netAmount: number;
  generatedAt: string;
}

export interface PayrollItemResponse {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  salaryType: "HOURLY" | "DAILY" | "MONTHLY";
  baseSalary: number;
  totalWorkingDays: number;
  presentDays: number;
  totalHours: number;
  overtimeHours: number;
  grossSalary: number;
  overtimeAmount: number;
  deductions: number;
  employeePf?: number | null;
  voluntaryPf?: number | null;
  tds?: number | null;
  netSalary: number;
  statutoryCalculation?: PayrollStatutoryCalculationResponse | null;
}

export interface PayrollStatutoryCalculationResponse {
  pfWages: number;
  employeePf: number;
  voluntaryPf: number;
  employerPf: number;
  employerEpf: number;
  eps: number;
  edli: number;
  adminCharge: number;
  projectedAnnualIncome: number;
  taxableIncome: number;
  baseTax: number;
  annualTax: number;
  taxAlreadyDeducted: number;
  currentMonthTds: number;
  taxRuleId?: string | null;
  pfRuleId?: string | null;
  calculationVersion?: string | null;
  calculationSnapshotJson?: string | null;
}

export interface PayrollRunDetailsResponse extends PayrollRunSummaryResponse {
  items: PayrollItemResponse[];
}

export interface PayrollDashboardResponse {
  totalPayrolls: number;
  draft: number;
  generated: number;
  approved: number;
  paid: number;
  cancelled: number;
  thisMonthPayroll: number;
  thisYearPayroll: number;
}

export interface PayrollSearchParams {
  month?: number;
  year?: number;
  status?: PayrollStatus;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: SortDirection;
}