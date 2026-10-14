import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { z } from "zod";
import { baseApi } from "@/services/baseApi";
import {
  domainPageSchema, domainSchema, envelopeSchema, membershipSchema, pageSchema, productSchema,
  type ProductInput, type ProductUpdate,
} from "./contracts";

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
} = partnerSaasApi;
