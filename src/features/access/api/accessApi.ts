import { baseApi } from "@/services/baseApi";
import type { CreateUserRequest, UserAccount } from "../types/access.types";

export const accessApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUserAccounts: builder.query<UserAccount[], void>({
      query: () => "/api/users",
      providesTags: ["User"],
    }),

    createUserAccount: builder.mutation<UserAccount, CreateUserRequest>({
      query: (body) => ({
        url: "/api/users",
        method: "POST",
        body,
      }),
      invalidatesTags: ["User"],
    }),

    deactivateUserAccount: builder.mutation<void, string>({
      query: (id) => ({
        url: `/api/users/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["User"],
    }),
  }),
});

export const {
  useGetUserAccountsQuery,
  useCreateUserAccountMutation,
  useDeactivateUserAccountMutation,
} = accessApi;
