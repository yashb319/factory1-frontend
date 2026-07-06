import { baseApi } from "@/services/baseApi";
import type {
  AuthResponse,
  ForgotPasswordOtpRequest,
  LoginOtpRequest,
  LoginRequest,
  MessageResponse,
  ResetPasswordRequest,
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

    sendForgotPasswordOtp: builder.mutation<
      MessageResponse,
      ForgotPasswordOtpRequest
    >({
      query: (body) => ({
        url: "/api/auth/forgot-password-otp",
        method: "POST",
        body,
      }),
    }),

    sendLoginOtp: builder.mutation<MessageResponse, LoginOtpRequest>({
      query: (body) => ({
        url: "/api/auth/login-otp",
        method: "POST",
        body,
      }),
    }),

    resetPassword: builder.mutation<MessageResponse, ResetPasswordRequest>({
      query: (body) => ({
        url: "/api/auth/reset-password",
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
  useSendLoginOtpMutation,
  useSendForgotPasswordOtpMutation,
  useResetPasswordMutation,
} = authApi;
