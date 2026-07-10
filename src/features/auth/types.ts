export type UserRole =
  | "OWNER"
  | "ADMIN"
  | "FINANCE"
  | "MANAGEMENT"
  | "SAAS_OWNER";
export type UserStatus = "ACTIVE" | "INACTIVE";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  organizationId: string;
  platformAdmin?: boolean;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
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
