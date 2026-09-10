import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { toast } from "sonner";
import { logout } from "@/features/auth/authSlice";
import type { RootState } from "@/lib/store";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,

  prepareHeaders: (headers, { endpoint, getState }) => {
    if (
      endpoint === "login" ||
      endpoint === "signupOrganization" ||
      endpoint === "sandboxSignup" ||
      endpoint === "sendSignupOtp" ||
      endpoint === "sendLoginOtp" ||
      endpoint === "sendForgotPasswordOtp" ||
      endpoint === "resetPassword" ||
      endpoint === "activateEmployee" ||
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

  if (result.error?.status === 403 && isFeatureDisabledError(result.error)) {
    toast.error("This feature is not enabled for your organization", {
      description:
        "Reach out to your organization owner or Factory1 support to enable it.",
    });
  }

  return result;
};

export function isFeatureDisabledError(error: FetchBaseQueryError) {
  const data = error.data;

  if (!data || typeof data !== "object") {
    return false;
  }

  if ("code" in data && data.code === "FEATURE_DISABLED") {
    return true;
  }

  return (
    "message" in data &&
    typeof data.message === "string" &&
    data.message.includes("FEATURE_DISABLED")
  );
}

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
    "Leave",
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
    "Production",
    "FeatureGating",
    "Whitelabel",
    "WhitelabelPartner",
  ],

  endpoints: () => ({}),
});
