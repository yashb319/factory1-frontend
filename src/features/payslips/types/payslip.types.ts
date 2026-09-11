import type { PayslipTemplateData } from "../../payslip-templates/types/payslipTemplate.types";

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PayslipResponse {
  id: string;
  organizationId: string;
  employeeId: string;
  payrollRunId: string;
  payrollItemId: string;
  templateId: string;
  templateVersion: number;
  payPeriodMonth: number;
  payPeriodYear: number;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  generatedAt: string;
  payslipData: Record<string, unknown>;
}

export interface PayslipShareLinkRequest {
  expiryDays?: number;
  maxViews?: number;
  passwordRequired?: boolean;
  password?: string;
}

export interface PayslipShareLinkResponse {
  tokenId: string;
  token: string;
  url: string;
  expiresAt: string;
  maxViews?: number | null;
  passwordRequired: boolean;
}

export interface PublicPayslipAccessRequest {
  password?: string;
}

export interface PublicPayslipResponse {
  payslipId: string;
  payPeriodMonth: number;
  payPeriodYear: number;
  templateId: string;
  templateVersion: number;
  templateData: PayslipTemplateData;
  payslipData: Record<string, unknown>;
  generatedAt: string;
}
