import { baseApi } from "@/services/baseApi";
import type { CostingApiEnvelope } from "./costingContract";
import { unwrapCostingEnvelope } from "./costingContract";
import { toProfitSimulationResult } from "./profitSimulatorAdapters";
import type {
  ProfitSimulationRequestDto,
  ProfitSimulationResponseDto,
} from "../types/profitSimulatorApi.types";
import type { ProfitSimulationResult } from "../types/profitSimulator.types";

export const PROFIT_SIMULATOR_API_ROUTE =
  "/api/costing/profitability/simulations";

export const profitSimulatorApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    simulateProductProfit: builder.mutation<
      ProfitSimulationResult,
      ProfitSimulationRequestDto
    >({
      query: (body) => ({
        url: PROFIT_SIMULATOR_API_ROUTE,
        method: "POST",
        body,
      }),
      transformResponse: (
        response: CostingApiEnvelope<ProfitSimulationResponseDto>
      ) => toProfitSimulationResult(unwrapCostingEnvelope(response)),
    }),
  }),
});

export const { useSimulateProductProfitMutation } = profitSimulatorApi;
