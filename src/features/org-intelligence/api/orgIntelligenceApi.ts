import { baseApi } from "@/services/baseApi";
import type { OrgIntelligenceResponse } from "../types/orgIntelligence.types";

// GET /api/org-intelligence is OWNER-only, reads the organization from the
// authenticated principal (no org id in the request), and returns the raw
// response body directly — it is not wrapped in the app's usual
// ApiResponse<T> envelope. The endpoint is also served with
// Cache-Control: no-store, so we skip RTK Query cache reuse across
// unmount/remount by keeping the default (unpersisted) cache behavior.
export const orgIntelligenceApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getOrgIntelligence: builder.query<OrgIntelligenceResponse, void>({
      query: () => ({
        url: "/api/org-intelligence",
        method: "GET",
      }),
      providesTags: ["OrgIntelligence"],
    }),
  }),
});

export const { useGetOrgIntelligenceQuery } = orgIntelligenceApi;
