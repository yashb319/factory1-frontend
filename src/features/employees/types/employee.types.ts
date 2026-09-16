export type EmployeeStatus = "ACTIVE" | "INACTIVE";
export type EmployeeType = "BLUE_COLLAR" | "STAFF" | "SUPERVISOR" | "MANAGER";
export type SalaryType = "HOURLY" | "DAILY" | "MONTHLY";

export interface Employee {
  id: string;
  employeeCode: string;
  name: string;
  phone?: string;
  email?: string;
  photoDataUrl?: string;
  employeeType: EmployeeType;
  designation?: string;
  department?: string;
  salaryRate: number;
  salaryType: SalaryType;
  joiningDate?: string;
  status: EmployeeStatus;
  accountActivated?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type PfCalculationType =
  | "STATUTORY_CEILING"
  | "ACTUAL_WAGES"
  | "CUSTOM";
export type TaxRegime = "OLD" | "NEW";

export interface EmployeeStatutoryProfileRequest {
  panNumber?: string;
  uan?: string;
  pfAccountNumber?: string;
  pfEnabled?: boolean;
  epsMember?: boolean;
  pfCalculationType?: PfCalculationType;
  customPfWage?: number;
  voluntaryPfEnabled?: boolean;
  voluntaryPfPercent?: number;
  taxRegime?: TaxRegime;
  previousEmployerIncome?: number;
  otherDeclaredIncome?: number;
  housePropertyIncome?: number;
  declaredDeductionsTotal?: number;
}

export interface EmployeeStatutoryProfileResponse
  extends EmployeeStatutoryProfileRequest {
  readonly id: string;
  readonly organizationId: string;
  readonly employeeId: string;
}

export interface EmployeeListParams {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  search?: string;
  department?: string;
  status?: EmployeeStatus | "ALL";
  employeeType?: EmployeeType | "ALL";
  salaryType?: SalaryType | "ALL";
}

export interface CreateEmployeeRequest {
  name: string;
  phone?: string;
  email?: string;
  photoDataUrl?: string;
  employeeType: EmployeeType;
  designation?: string;
  department?: string;
  salaryRate: number;
  salaryType: SalaryType;
  joiningDate?: string;
  status: EmployeeStatus;
}

export type UpdateEmployeeRequest = CreateEmployeeRequest;

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface EmployeeImportRowInput {
  rowNumber: number;
  employeeCode?: string | null;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  photoDataUrl?: string | null;
  employeeType?: string | null;
  designation?: string | null;
  department?: string | null;
  salaryRate?: string | null;
  salaryType?: string | null;
  joiningDate?: string | null;
  status?: string | null;
}

export interface BulkEmployeeImportRequest {
  rows: EmployeeImportRowInput[];
}

export interface EmployeeImportRow {
  rowNumber: number;
  employeeCode?: string | null;
  employee?: Partial<Employee> | null;
  errors: string[];
}

export interface EmployeeImportPreviewResponse {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  rows: EmployeeImportRow[];
}

export interface EmployeeImportResult {
  createdRows: number;
  updatedRows: number;
  skippedRows: number;
  errors: EmployeeImportRow[];
}

export interface EmployeeInvitationResult {
  invited?: number;
  skipped?: number;
  errors?: number;
  [key: string]: unknown;
}
