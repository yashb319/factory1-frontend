export type UserRole = "OWNER" | "ADMIN" | "FINANCE" | "MANAGEMENT";
export type UserStatus = "ACTIVE" | "INACTIVE";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  organizationId: string;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type SignupOrganizationRequest = {
  organizationName: string;
  ownerName: string;
  email: string;
  password: string;
  otp: string;
};

export type SignupOtpRequest = {
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
