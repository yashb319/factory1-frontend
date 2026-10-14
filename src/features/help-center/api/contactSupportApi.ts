import { baseApi } from "@/services/baseApi";
import {
  isContactSupportResponse,
  type ContactSupportRequest,
  type ContactSupportResponse,
} from "../contactSupport";

export const contactSupportApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    contactEmployeeSupport: builder.mutation<ContactSupportResponse, ContactSupportRequest>({
      async queryFn(body, _api, _extraOptions, baseQuery) {
        const result = await baseQuery({
          url: "/api/employee-portal/help/contact",
          method: "POST",
          body,
        });
        if (result.error) return { error: result.error };
        if (!isContactSupportResponse(result.data)) {
          return {
            error: {
              status: "CUSTOM_ERROR",
              error: "Support did not confirm delivery. Your message has not been confirmed as sent.",
            },
          };
        }
        return { data: result.data };
      },
    }),
  }),
});

export const { useContactEmployeeSupportMutation } = contactSupportApi;
