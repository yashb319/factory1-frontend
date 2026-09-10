export type UserRole =
  | "OWNER"
  | "ADMIN"
  | "EMPLOYEE"
  | "FINANCE"
  | "MANAGEMENT"
  | "EMPLOYEE"
  | "SAAS_OWNER"
  | "PARTNER_ADMIN";
export type UserStatus = "ACTIVE" | "INACTIVE";
export type OrganizationStatus =
  | "PENDING_APPROVAL"
  | "ACTIVE"
  | "SUSPENDED"
  | "TERMINATED";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  organizationId: string;
  organizationStatus: OrganizationStatus;
  platformAdmin?: boolean;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};

export type SandboxSignupRequest = {
  name: string;
  organizationName: string;
  email: string;
};

export type LoginRequest = {
  email: string;
  password: string;
  otp?: string;
};

export type SignupOrganizationRequest = {
  organizationName: string;
  ownerName: string;
  email: string;
  password: string;
  otp: string;
  location: string;
  city?: string;
  pincode?: string;
  country?: string;
  industryType: string;
  employeeCountEstimate: number;
  gstNumber?: string;
  businessType?: string;
  state?: string;
  partnerCode?: string;
};

export type SignupOtpRequest = {
  email: string;
};

export type LoginOtpRequest = {
  email: string;
};

export type MessageResponse = {
  message: string;
  debug?: Record<string, unknown> | null;
};

export type ForgotPasswordOtpRequest = {
  email: string;
};

export type ResetPasswordRequest = {
  email: string;
  otp: string;
  password: string;
};

export type ActivateEmployeeRequest = {
  token: string;
  password: string;
};

export type EarlyRegistrationQuestionnaireRequest = {
  organizationId?: string;
  organizationName?: string;
  ownerName?: string;
  email?: string;
  industryType?: string;
  employeeCountEstimate?: number;
  biggestProblem: string;
  currentProcess?: string;
  modulesNeeded?: string[];
  urgency?: string;
  phone?: string;
  notes?: string;
};
