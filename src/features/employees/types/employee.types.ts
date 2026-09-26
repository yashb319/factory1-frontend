export type EmployeeStatus = "ACTIVE" | "INACTIVE";
export type SalaryType = "HOURLY" | "DAILY" | "MONTHLY";
export type Gender = "MALE" | "FEMALE" | "OTHER";
export type MaritalStatus = "SINGLE" | "MARRIED" | "DIVORCED" | "WIDOWED" | "OTHER";
export type EmploymentBasis = "FULL_TIME" | "PART_TIME" | "CONTRACT";

export interface Employee {
  id: string;
  employeeCode: string;
  name: string;
  phone?: string;
  email?: string;
  photoDataUrl?: string;
  designation?: string;
  department?: string;
  salaryRate: number;
  salaryType: SalaryType;
  joiningDate?: string;
  status: EmployeeStatus;
  accountActivated?: boolean;
  createdAt?: string;
  updatedAt?: string;

  location?: string;
  dateOfBirth?: string;
  gender?: Gender;
  address?: string;
  mobile?: string;
  permanentAddress?: string;
  maritalStatus?: MaritalStatus;
  aadhaarNumber?: string;
  bankAccountNumber?: string;
  bankName?: string;
  bankBranchName?: string;
  bankIfscCode?: string;
  employmentBasis?: EmploymentBasis;
  reportingToEmployeeId?: string;

  // Read-only, resolved/sourced server-side.
  readonly reportingToEmployeeCode?: string;
  readonly reportingToEmployeeName?: string;
  readonly panNumber?: string;
  readonly uan?: string;
  readonly taxRegime?: TaxRegime;
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
  salaryType?: SalaryType | "ALL";
}

export interface CreateEmployeeRequest {
  code?: string;
  name: string;
  phone?: string;
  email?: string;
  photoDataUrl?: string;
  designation?: string;
  department?: string;
  salaryRate: number;
  salaryType: SalaryType;
  joiningDate?: string;
  status: EmployeeStatus;

  location?: string;
  dateOfBirth?: string;
  gender?: Gender;
  address?: string;
  mobile?: string;
  permanentAddress?: string;
  maritalStatus?: MaritalStatus;
  aadhaarNumber?: string;
  bankAccountNumber?: string;
  bankName?: string;
  bankBranchName?: string;
  bankIfscCode?: string;
  employmentBasis?: EmploymentBasis;
  reportingToEmployeeId?: string;
}

export type UpdateEmployeeRequest = Omit<CreateEmployeeRequest, "code">;

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
  designation?: string | null;
  department?: string | null;
  salaryRate?: string | null;
  salaryType?: string | null;
  joiningDate?: string | null;
  status?: string | null;

  locationRaw?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  address?: string | null;
  mobile?: string | null;
  permanentAddress?: string | null;
  maritalStatus?: string | null;
  aadhaarNumber?: string | null;
  bankAccountNumber?: string | null;
  bankName?: string | null;
  bankBranchName?: string | null;
  bankIfscCode?: string | null;
  employmentBasis?: string | null;
  reportingTo?: string | null;
  panNumber?: string | null;
  uan?: string | null;
  taxRegime?: string | null;
}

export interface BulkEmployeeImportRequest {
  rows: EmployeeImportRowInput[];
  existingCodeResolution: "SKIP" | "UPDATE";
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
