import { baseApi } from "@/services/baseApi";
import type {
  AuthResponse,
  LoginRequest,
  MessageResponse,
  SignupOrganizationRequest,
  SignupOtpRequest,
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

    sendSignupOtp: builder.mutation<MessageResponse, SignupOtpRequest>({
      query: (body) => ({
        url: "/api/auth/signup-otp",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useSignupOrganizationMutation,
  useSendSignupOtpMutation,
} = authApi;
