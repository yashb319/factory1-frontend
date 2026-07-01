import { baseApi } from "@/services/baseApi";
import type {
  AuthResponse,
  LoginRequest,
  SignupOrganizationRequest,
} from "./types";

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (body) => ({
        url: "/api/auth/login",
        method: "POST",
        body,
      }),
    }),

    signupOrganization: builder.mutation<
      AuthResponse,
      SignupOrganizationRequest
    >({
      query: (body) => ({
        url: "/api/auth/register",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const { useLoginMutation, useSignupOrganizationMutation } = authApi;