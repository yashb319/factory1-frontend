export type UserRole = "OWNER" | "ADMIN" | "FINANCE" | "MANAGEMENT";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
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
};
