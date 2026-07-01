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
}

export interface OrganizationSettingsResponse
  extends OrganizationSettingsRequest {
  id: string;
  organizationId: string;
}