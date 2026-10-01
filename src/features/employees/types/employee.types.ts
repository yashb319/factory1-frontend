export type EmployeeStatus = "ACTIVE" | "INACTIVE";
export type SalaryType = "HOURLY" | "DAILY" | "MONTHLY";
export type Gender = "MALE" | "FEMALE" | "OTHER";
export type MaritalStatus = "SINGLE" | "MARRIED" | "DIVORCED" | "WIDOWED" | "OTHER";
export type EmploymentBasis = "FULL_TIME" | "PART_TIME" | "CONTRACT";

export interface EmployeeInsuranceDetails {
  fatherName?: string;
  fatherDateOfBirth?: string;
  fatherGender?: Gender;
  motherName?: string;
  motherDateOfBirth?: string;
  motherGender?: Gender;
  spouseName?: string;
  spouseDateOfBirth?: string;
  spouseGender?: Gender;
  child1Name?: string;
  child1DateOfBirth?: string;
  child1Gender?: Gender;
  child2Name?: string;
  child2DateOfBirth?: string;
  child2Gender?: Gender;
  heightCm?: number;
  weightKg?: number;
  smoker?: boolean;
  occupation?: string;
  organizationName?: string;
  annualIncome?: number;
  education?: string;
  nomineeName?: string;
  nomineeDateOfBirth?: string;
  nomineeGender?: Gender;
  nomineeRelationship?: string;
}

export interface Employee extends EmployeeInsuranceDetails {
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

export interface CreateEmployeeRequest extends EmployeeInsuranceDetails {
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
  statutoryProfile?: EmployeeStatutoryProfileRequest;
}

export type UpdateEmployeeRequest = Omit<
  CreateEmployeeRequest,
  "code" | "statutoryProfile"
>;

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
  fatherName?: string | null;
  fatherDateOfBirth?: string | null;
  fatherGender?: string | null;
  motherName?: string | null;
  motherDateOfBirth?: string | null;
  motherGender?: string | null;
  spouseName?: string | null;
  spouseDateOfBirth?: string | null;
  spouseGender?: string | null;
  child1Name?: string | null;
  child1DateOfBirth?: string | null;
  child1Gender?: string | null;
  child2Name?: string | null;
  child2DateOfBirth?: string | null;
  child2Gender?: string | null;
  heightCm?: string | null;
  weightKg?: string | null;
  smoker?: string | null;
  occupation?: string | null;
  organizationName?: string | null;
  annualIncome?: string | null;
  education?: string | null;
  nomineeName?: string | null;
  nomineeDateOfBirth?: string | null;
  nomineeGender?: string | null;
  nomineeRelationship?: string | null;
  existingCodeResolution?: "SKIP" | "UPDATE";
}

export interface EmployeeImportRow {
  rowNumber: number;
  employeeCode?: string | null;
  resolvedEmployeeCode?: string | null;
  existingCodeOutcome: "CONFLICT" | "SKIP" | "UPDATE" | "NEW";
  employee?: Partial<Employee> | null;
  statutoryProfile?: EmployeeStatutoryProfileRequest | null;
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
  rows: EmployeeImportRow[];
  errors: EmployeeImportRow[];
}

export interface EmployeeInvitationResult {
  invited?: number;
  skipped?: number;
  errors?: number;
  [key: string]: unknown;
}

export type EmployeeOffboardingStatus =
  | "PREVIEW"
  | "CONFIRMED"
  | "PAYROLL_FAILED"
  | "REVOCATION_SCHEDULED"
  | "COMPLETED"
  | "CANCELLED";

export interface EmployeeOffboardingRequest {
  lastWorkingDate: string;
  remarks?: string;
  includeLeaveEncashment: boolean;
  leaveTypeIds: string[];
}

export interface EmployeeOffboardingLeaveSettlement {
  leaveTypeId: string;
  leaveTypeCode: string;
  leaveTypeName: string;
  availableDays: number;
  encashmentSupported: boolean;
  encashableDays: number;
  encashmentAmount: number;
}

export interface EmployeeOffboardingWorkWarning {
  type: string;
  referenceId?: string | null;
  referenceCode?: string | null;
  description: string;
}

export interface EmployeeOffboardingPayrollEstimate {
  periodStart: string;
  periodEnd: string;
  grossEarnings: number;
  deductions: number;
  leaveEncashment: number;
  netPay: number;
  currency: string;
}

export interface EmployeeOffboardingResponse {
  id?: string | null;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  status: EmployeeOffboardingStatus;
  lastWorkingDate: string;
  remarks?: string | null;
  includeLeaveEncashment: boolean;
  leaveTypeIds: string[];
  leaveSettlements: EmployeeOffboardingLeaveSettlement[];
  pendingWorkWarnings: EmployeeOffboardingWorkWarning[];
  payrollEstimate: EmployeeOffboardingPayrollEstimate | null;
  accessRevocationAt: string;
  accessRevocationScheduled: boolean;
  canConfirm: boolean;
  canCancel: boolean;
  validationMessages: string[];
}
