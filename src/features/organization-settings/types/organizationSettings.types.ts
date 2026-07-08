export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface OrganizationSettingsRequest {
  workingHoursPerDay: number;
  workingDaysPerMonth: number;
  overtimeMultiplier: number;
  currency: string;
  timezone: string;
  weekStartDay: string;
  financialYearStartMonth: number;
  organizationName: string;
  location?: string;
  industryType?: string;
  employeeCountEstimate?: number;
  gstNumber?: string;
  businessType?: string;
  state?: string;
}

export interface OrganizationSettingsResponse
  extends OrganizationSettingsRequest {
  id: string;
  organizationId: string;
  organizationEmail?: string;
  phone?: string;
  attendanceCaptureKey?: string;
}
