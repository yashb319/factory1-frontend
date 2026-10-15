import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { z } from "zod";
import { baseApi } from "@/services/baseApi";
import {
  domainPageSchema, domainSchema, envelopeSchema, membershipSchema, pageSchema, productSchema,
  type ProductInput, type ProductUpdate,
} from "./contracts";
import { customerSchema, onboardingInputSchema, onboardingPolicySchema, tenantMembershipSchema, userProductGrantSchema, type OnboardingInput } from "./onboarding/contracts";

export type ProductScope = { partnerId: string; platform: boolean };
type PageArgs = ProductScope & { offset: number; limit: number };
type ProductArgs = ProductScope & { productId: string };
type Runner = (args: string | FetchArgs) => ReturnType<BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError>>;

async function validated<T>(run: Runner, args: string | FetchArgs, schema: z.ZodType<T>) {
  const result = await run(args);
  if (result.error) return { error: result.error };
  const parsed = envelopeSchema(schema).safeParse(result.data);
  if (!parsed.success) {
    console.error("Partner SaaS foundation response did not match the versioned contract");
    return { error: { status: "CUSTOM_ERROR" as const, error: "The server response could not be verified. Refresh before continuing." } };
  }
  return { data: parsed.data.data };
}

function productsPath(scope: ProductScope) {
  return scope.platform
    ? `/api/saas-admin/v2/partners/${encodeURIComponent(scope.partnerId)}/products`
    : "/api/partner/v2/products";
}
function productPath(scope: ProductArgs) {
  return `${productsPath(scope)}/${encodeURIComponent(scope.productId)}`;
}

export const partnerSaasApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPartnerMemberships: builder.query<z.infer<ReturnType<typeof pageSchema<typeof membershipSchema>>>, { offset: number; limit: number }>({
      queryFn: (args, _api, _extra, run) => validated(run, { url: "/api/partner/v2/memberships", params: args }, pageSchema(membershipSchema)),
    }),
    getProductOnboardingPolicy: builder.query<z.infer<typeof onboardingPolicySchema>, ProductArgs>({
      queryFn: (args, _api, _extra, run) => validated(run, `${productPath(args)}/onboarding-policy`, onboardingPolicySchema),
      providesTags: ["PartnerSaas"],
    }),
    getProductCustomers: builder.query<z.infer<ReturnType<typeof pageSchema<typeof customerSchema>>>, ProductArgs & { offset: number; limit: number }>({
      queryFn: (args, _api, _extra, run) => validated(run, {
        url: `${productPath(args)}/customers`, params: { offset: args.offset, limit: args.limit },
      }, pageSchema(customerSchema)),
      providesTags: ["PartnerSaas"],
    }),
    getProductCustomer: builder.query<z.infer<typeof customerSchema>, ProductArgs & { customerId: string }>({
      queryFn: (args, _api, _extra, run) => validated(run,
        `${productPath(args)}/customers/${encodeURIComponent(args.customerId)}`, customerSchema),
      providesTags: ["PartnerSaas"],
    }),
    onboardProductCustomer: builder.mutation<z.infer<typeof customerSchema>, ProductArgs & { body: OnboardingInput }>({
      queryFn: (args, _api, _extra, run) => {
        const parsed = onboardingInputSchema.safeParse(args.body);
        if (!parsed.success) return { error: { status: "CUSTOM_ERROR", error: "Check the factory and owner details before submitting." } };
        return validated(run, { url: `${productPath(args)}/onboardings`, method: "POST", body: parsed.data }, customerSchema);
      },
      invalidatesTags: ["PartnerSaas"],
    }),
    getTenantMemberships: builder.query<z.infer<ReturnType<typeof pageSchema<typeof tenantMembershipSchema>>>, { organizationId: string; offset: number; limit: number }>({
      queryFn: (args, _api, _extra, run) => validated(run, {
        url: "/api/saas-admin/v2/tenant-memberships", params: args,
      }, pageSchema(tenantMembershipSchema)),
      providesTags: ["PartnerSaas"],
    }),
    createTenantMembership: builder.mutation<z.infer<typeof tenantMembershipSchema>, { organizationId: string; userId: string; role: z.infer<typeof tenantMembershipSchema>["role"] }>({
      queryFn: ({ organizationId, ...body }, _api, _extra, run) => validated(run, {
        url: "/api/saas-admin/v2/tenant-memberships", params: { organizationId }, method: "POST", body,
      }, tenantMembershipSchema),
      invalidatesTags: ["PartnerSaas"],
    }),
    updateTenantMembership: builder.mutation<z.infer<typeof tenantMembershipSchema>, z.infer<typeof tenantMembershipSchema>>({
      queryFn: (args, _api, _extra, run) => validated(run, {
        url: `/api/saas-admin/v2/tenant-memberships/${encodeURIComponent(args.userId)}`, params: { organizationId: args.organizationId },
        method: "PATCH", body: { role: args.role, status: args.status, expectedVersion: args.version },
      }, tenantMembershipSchema),
      invalidatesTags: ["PartnerSaas"],
    }),
    getUserProductGrants: builder.query<z.infer<ReturnType<typeof pageSchema<typeof userProductGrantSchema>>>, { subscriptionId: string; offset: number; limit: number }>({
      queryFn: ({ subscriptionId, ...params }, _api, _extra, run) => validated(run, {
        url: `/api/saas-admin/v2/subscriptions/${encodeURIComponent(subscriptionId)}/grants`, params,
      }, pageSchema(userProductGrantSchema)),
      providesTags: ["PartnerSaas"],
    }),
    createUserProductGrant: builder.mutation<z.infer<typeof userProductGrantSchema>, { subscriptionId: string; userId: string }>({
      queryFn: ({ subscriptionId, userId }, _api, _extra, run) => validated(run, {
        url: `/api/saas-admin/v2/subscriptions/${encodeURIComponent(subscriptionId)}/grants`, method: "POST", body: { userId },
      }, userProductGrantSchema),
      invalidatesTags: ["PartnerSaas"],
    }),
    revokeUserProductGrant: builder.mutation<unknown, { subscriptionId: string; userId: string }>({
      queryFn: ({ subscriptionId, userId }, _api, _extra, run) => validated(run, {
        url: `/api/saas-admin/v2/subscriptions/${encodeURIComponent(subscriptionId)}/grants/${encodeURIComponent(userId)}`, method: "DELETE",
      }, z.unknown()),
      invalidatesTags: ["PartnerSaas"],
    }),
    getSaasProducts: builder.query<z.infer<ReturnType<typeof pageSchema<typeof productSchema>>>, PageArgs>({
      queryFn: (args, _api, _extra, run) => validated(run, {
        url: productsPath(args), params: { offset: args.offset, limit: args.limit, ...(!args.platform ? { partnerId: args.partnerId } : {}) },
      }, pageSchema(productSchema)),
      providesTags: ["PartnerSaas"],
    }),
    getSaasProductFeatures: builder.query<string[], ProductScope>({
      queryFn: (scope, _api, _extra, run) => validated(run,
        scope.platform ? `/api/saas-admin/v2/partners/${encodeURIComponent(scope.partnerId)}/feature-catalog` : "/api/partner/v2/feature-catalog",
        z.array(z.string())),
    }),
    createSaasProduct: builder.mutation<z.infer<typeof productSchema>, ProductScope & { body: ProductInput }>({
      queryFn: (args, _api, _extra, run) => validated(run, {
        url: productsPath(args), method: "POST",
        body: args.platform ? args.body : { ...args.body, partnerId: args.partnerId },
      }, productSchema),
      invalidatesTags: ["PartnerSaas"],
    }),
    updateSaasProduct: builder.mutation<z.infer<typeof productSchema>, ProductArgs & { body: ProductUpdate }>({
      queryFn: (args, _api, _extra, run) => validated(run, {
        url: productPath(args), method: "PATCH", body: args.body,
      }, productSchema),
      invalidatesTags: ["PartnerSaas"],
    }),
    getProductDomains: builder.query<z.infer<typeof domainPageSchema>, ProductArgs & { offset: number; limit: number }>({
      queryFn: (args, _api, _extra, run) => validated(run, {
        url: `${productPath(args)}/domains`, params: { offset: args.offset, limit: args.limit },
      }, domainPageSchema),
      providesTags: ["PartnerSaas"],
    }),
    requestProductDomain: builder.mutation<z.infer<typeof domainSchema>, ProductArgs & { hostname: string }>({
      queryFn: (args, _api, _extra, run) => validated(run, {
        url: `${productPath(args)}/domains`, method: "POST", body: { hostname: args.hostname },
      }, domainSchema),
      invalidatesTags: ["PartnerSaas"],
    }),
    verifyProductDomain: builder.mutation<z.infer<typeof domainSchema>, ProductArgs & { domainId: string }>({
      queryFn: (args, _api, _extra, run) => validated(run, {
        url: `${productPath(args)}/domains/${encodeURIComponent(args.domainId)}/verify`, method: "POST",
      }, domainSchema),
      invalidatesTags: ["PartnerSaas"],
    }),
    renewProductDomainChallenge: builder.mutation<z.infer<typeof domainSchema>, ProductArgs & { domainId: string; expectedVersion: number }>({
      queryFn: (args, _api, _extra, run) => validated(run, {
        url: `${productPath(args)}/domains/${encodeURIComponent(args.domainId)}/challenge`, method: "POST",
        body: { expectedVersion: args.expectedVersion },
      }, domainSchema),
      invalidatesTags: ["PartnerSaas"],
    }),
    updateProductDomain: builder.mutation<z.infer<typeof domainSchema>, ProductArgs & { domainId: string; expectedVersion: number; status: "SUSPENDED" | "RETIRED" }>({
      queryFn: (args, _api, _extra, run) => validated(run, {
        url: `${productPath(args)}/domains/${encodeURIComponent(args.domainId)}`, method: "PATCH",
        body: { status: args.status, expectedVersion: args.expectedVersion },
      }, domainSchema),
      invalidatesTags: ["PartnerSaas"],
    }),
  }),
});

export const {
  useGetPartnerMembershipsQuery, useGetSaasProductsQuery, useGetSaasProductFeaturesQuery,
  useCreateSaasProductMutation, useUpdateSaasProductMutation,
  useGetProductDomainsQuery, useRequestProductDomainMutation, useVerifyProductDomainMutation,
  useRenewProductDomainChallengeMutation, useUpdateProductDomainMutation,
  useGetProductOnboardingPolicyQuery, useGetProductCustomersQuery, useGetProductCustomerQuery, useOnboardProductCustomerMutation,
  useGetTenantMembershipsQuery, useCreateTenantMembershipMutation, useUpdateTenantMembershipMutation,
  useGetUserProductGrantsQuery, useCreateUserProductGrantMutation, useRevokeUserProductGrantMutation,
} = partnerSaasApi;
