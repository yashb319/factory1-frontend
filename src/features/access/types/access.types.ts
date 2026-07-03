import type { AuthUser, UserRole } from "@/features/auth/types";

export type CreateUserRequest = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
};

export type UserAccount = AuthUser;
