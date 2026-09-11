export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export type PayslipTemplateStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface PayslipTemplateRow {
  label: string;
  field: string;
}

export interface PayslipTemplateData {
  header: {
    showLogo: boolean;
    companyName: string;
    companyAddress: string;
  };
  employeeInfo: {
    fields: string[];
  };
  earnings: {
    rows: PayslipTemplateRow[];
  };
  deductions: {
    rows: PayslipTemplateRow[];
  };
  employerContributions: {
    rows: PayslipTemplateRow[];
  };
  netPay: {
    field: string;
    amountInWords: boolean;
  };
  signatureBlock: {
    showSignature: boolean;
    text: string;
  };
}

export interface PayslipTemplateRequest {
  name: string;
  description?: string;
  templateData: PayslipTemplateData;
  logoFileKey?: string;
  signatureFileKey?: string;
}

export interface PayslipTemplateResponse {
  id: string;
  organizationId: string;
  logicalTemplateId: string;
  name: string;
  description?: string | null;
  isDefault: boolean;
  status: PayslipTemplateStatus;
  version: number;
  templateData: PayslipTemplateData;
  logoFileKey?: string | null;
  signatureFileKey?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Known placeholder keys the backend resolves onto a generated payslip's
 * snapshot data (see PayslipGenerationServiceImpl.buildSnapshot on the
 * backend) — kept in sync manually since templateData is a flexible JSON
 * blob with no shared schema package.
 */
export const EMPLOYEE_INFO_FIELD_OPTIONS = [
  { label: "Employee name", value: "employee.name" },
  { label: "Employee code", value: "employee.employeeCode" },
  { label: "Designation", value: "employee.designation" },
  { label: "Department", value: "employee.department" },
  { label: "Email", value: "employee.email" },
  { label: "Phone", value: "employee.phone" },
  { label: "Pay period", value: "payPeriod" },
];

export const EARNINGS_FIELD_OPTIONS = [
  { label: "Basic", value: "basic" },
  { label: "Gross salary", value: "grossSalary" },
  { label: "Overtime amount", value: "overtimeAmount" },
];

export const DEDUCTIONS_FIELD_OPTIONS = [
  { label: "Employee PF", value: "employeePf" },
  { label: "Voluntary PF", value: "voluntaryPf" },
  { label: "TDS", value: "tds" },
  { label: "Other deductions", value: "deductions" },
];

export const EMPLOYER_CONTRIBUTION_FIELD_OPTIONS = [
  { label: "Employer PF", value: "employerPf" },
  { label: "Employer EPF", value: "employerEpf" },
  { label: "EPS", value: "eps" },
  { label: "EDLI", value: "edli" },
  { label: "Admin charge", value: "adminCharge" },
  { label: "PF wages", value: "pfWages" },
  { label: "Taxable income", value: "taxableIncome" },
];

export const DEFAULT_TEMPLATE_DATA: PayslipTemplateData = {
  header: {
    showLogo: true,
    companyName: "{{organization.name}}",
    companyAddress: "{{organization.address}}",
  },
  employeeInfo: {
    fields: [
      "employee.name",
      "employee.employeeCode",
      "employee.designation",
      "employee.department",
      "payPeriod",
    ],
  },
  earnings: {
    rows: [
      { label: "Basic", field: "basic" },
      { label: "Gross Salary", field: "grossSalary" },
      { label: "Overtime", field: "overtimeAmount" },
    ],
  },
  deductions: {
    rows: [
      { label: "Employee PF", field: "employeePf" },
      { label: "Voluntary PF", field: "voluntaryPf" },
      { label: "TDS", field: "tds" },
    ],
  },
  employerContributions: {
    rows: [
      { label: "Employer PF", field: "employerPf" },
      { label: "EPS", field: "eps" },
      { label: "EDLI", field: "edli" },
      { label: "Admin Charge", field: "adminCharge" },
    ],
  },
  netPay: {
    field: "netSalary",
    amountInWords: true,
  },
  signatureBlock: {
    showSignature: true,
    text: "This is a system-generated payslip.",
  },
};
