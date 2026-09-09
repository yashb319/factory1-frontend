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

export interface EmployeeImportPreviewRow {
  rowNumber: number;
  data?: Record<string, unknown>;
  valid?: boolean;
  errors?: string[];
  warnings?: string[];
  [key: string]: unknown;
}

export interface EmployeeImportPreviewResponse {
  rows: EmployeeImportPreviewRow[];
  totalRows?: number;
  validRows?: number;
  invalidRows?: number;
  [key: string]: unknown;
}

export interface EmployeeImportResult {
  imported?: number;
  created?: number;
  updated?: number;
  skipped?: number;
  errors?: number;
  [key: string]: unknown;
}

export interface EmployeeInvitationResult {
  invited?: number;
  skipped?: number;
  errors?: number;
  [key: string]: unknown;
}
