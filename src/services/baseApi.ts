import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { logout } from "@/features/auth/authSlice";
import type { RootState } from "@/lib/store";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,

  prepareHeaders: (headers, { endpoint, getState }) => {
    if (
      endpoint === "login" ||
      endpoint === "signupOrganization" ||
      endpoint === "sendSignupOtp" ||
      endpoint === "sendLoginOtp" ||
      endpoint === "sendForgotPasswordOtp" ||
      endpoint === "resetPassword" ||
      endpoint === "submitEarlyRegistrationQuestionnaire"
    ) {
      headers.delete("Authorization");
      return headers;
    }

    const token = (getState() as RootState).auth.token;

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    return headers;
  },
});

const baseQueryWithAuthRedirect: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    api.dispatch(logout());

    if (typeof window !== "undefined") {
      window.location.assign("/login");
    }
  }

  if (result.error?.status === 403 && isPendingApprovalError(result.error)) {
    if (typeof window !== "undefined") {
      window.location.assign("/registration-pending");
    }
  }

  return result;
};

function isPendingApprovalError(error: FetchBaseQueryError) {
  const data = error.data;

  if (!data || typeof data !== "object") {
    return false;
  }

  return "message" in data && data.message === "ORGANIZATION_PENDING_APPROVAL";
}

export const baseApi = createApi({
  reducerPath: "baseApi",

  baseQuery: baseQueryWithAuthRedirect,

  tagTypes: [
    "Auth",
    "User",
    "Organization",
    "OrganizationSettings",
    "Employee",
    "Attendance",
    "Payroll",
    "Inventory",
    "StockMovement",
    "Supplier",
    "Customer",
    "Products",
    "Billing",
    "Accounting",
    "ImportExport",
    "Dashboard",
    "SaasAdmin",
  ],

  endpoints: () => ({}),
});
