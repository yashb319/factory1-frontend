import { describe, expect, it } from "vitest";
import {
  safeMarketSourceUrl,
  toMarketAvailability,
  toMarketComparable,
  toMarketSearchRequest,
  toMarketSummary,
} from "../api/marketIntelligenceAdapters";
import { toMarketRunRequest } from "../api/marketIntelligenceApi";
import type {
  MarketAvailabilityDto,
  MarketSearchRunDto,
  MarketSummaryDto,
} from "../types/marketIntelligenceApi.types";

const availability: MarketAvailabilityDto = {
  entitled: true,
  productCostingEntitled: true,
  providerConfigured: true,
  status: "AVAILABLE",
  provider: "SERPAPI_GOOGLE_SHOPPING",
  reasonCode: "AVAILABLE",
  catalog: {
    maxQueryLength: 300,
    maxResults: 40,
    supportedCountries: ["IN"],
    supportedCurrencies: ["INR"],
    channels: ["WHOLESALE", "RETAIL", "UNKNOWN"],
    attributes: ["material", "dimensions", "marketChannel"],
  },
};

const run: MarketSearchRunDto = {
  id: "run-1",
  productId: "product-1",
  provider: "SERPAPI_GOOGLE_SHOPPING",
  query: "Cabinet",
  requestHash: "hash",
  status: "SUCCEEDED",
  errorCode: "NONE",
  resultCount: 10,
  acceptedCount: 4,
};

const summary: MarketSummaryDto = {
  productId: "product-1",
  currency: "INR",
  range: {
    low: "120",
    median: "150",
    high: "190",
    sampleCount: 4,
    outlierCount: 1,
    method: "IQR_P25_MEDIAN_P75",
    channel: "RETAIL",
    mixedChannels: false,
  },
  confidence: "0.82",
  freshness: "FRESH",
  observedFrom: "2026-09-01",
  observedTo: "2026-10-01",
  reasonCode: null,
  sources: ["merchant.example"],
  missingFields: [],
  disclaimer: "Shipping and GST may differ.",
};

describe("market intelligence adapters", () => {
  it.each([
    [{ ...availability, entitled: false }, "ENTITLEMENT_REQUIRED"],
    [{ ...availability, productCostingEntitled: false }, "ENTITLEMENT_REQUIRED"],
    [
      { ...availability, reasonCode: "PROVIDER_DISABLED", status: "UNAVAILABLE" },
      "PROVIDER_DISABLED",
    ],
    [
      {
        ...availability,
        reasonCode: "PROVIDER_NOT_CONFIGURED",
        status: "UNAVAILABLE",
        providerConfigured: false,
      },
      "PROVIDER_MISCONFIGURED",
    ],
    [
      {
        ...availability,
        reasonCode: "PROVIDER_UNHEALTHY",
        status: "CIRCUIT_OPEN",
      },
      "PROVIDER_UNHEALTHY",
    ],
  ] as const)("maps availability without inventing evidence", (dto, expected) => {
    expect(toMarketAvailability(dto, false)).toBe(expected);
  });

  it("distinguishes running, failed, stale, expired, insufficient, empty, and successful states", () => {
    expect(toMarketAvailability(availability, true, { ...run, status: "RUNNING" })).toBe(
      "RUNNING"
    );
    expect(toMarketAvailability(availability, true, { ...run, status: "FAILED" })).toBe(
      "FAILED"
    );
    expect(
      toMarketAvailability(availability, true, run, {
        ...summary,
        freshness: "STALE",
      })
    ).toBe("STALE");
    expect(
      toMarketAvailability(availability, true, run, {
        ...summary,
        freshness: "EXPIRED",
      })
    ).toBe("EXPIRED");
    expect(
      toMarketAvailability(availability, true, run, {
        ...summary,
        range: null,
        reasonCode: "INSUFFICIENT_COMPARABLES",
      })
    ).toBe("INSUFFICIENT_COMPARABLES");
    expect(toMarketAvailability(availability, false)).toBe("NO_DATA");
    expect(toMarketAvailability(availability, true, run, summary)).toBe("AVAILABLE");
  });

  it("uses only backend-returned summary bounds and preserves a null range", () => {
    expect(toMarketSummary(summary)).toMatchObject({
      range: { currency: "INR", min: 120, max: 190 },
      median: { currency: "INR", value: 150 },
      sampleCount: 4,
      confidence: 0.82,
      outlierExclusions: 1,
    });
    expect(
      toMarketSummary({
        ...summary,
        range: null,
        reasonCode: "INSUFFICIENT_COMPARABLES",
      })
    ).toBeNull();
  });

  it("validates and bounds structured attributes without accepting URL or secret fields", () => {
    const request = toMarketSearchRequest(
      "product-1",
      [
        {
          key: "query",
          label: "Search query",
          type: "TEXT",
          required: true,
          maxLength: 20,
        },
        {
          key: "maxResults",
          label: "Results",
          type: "NUMBER",
          required: false,
          min: 1,
          max: 40,
        },
      ],
      { query: "Cabinet", maxResults: "25" }
    );
    expect(request.attributes).toEqual({ query: "Cabinet", maxResults: 25 });
    expect(request.requestKey.length).toBeGreaterThanOrEqual(8);
    expect(() =>
      toMarketSearchRequest(
        "product-1",
        [
          {
            key: "providerUrl",
            label: "Provider URL",
            type: "TEXT",
            required: false,
          },
        ],
        { providerUrl: "https://attacker.example" }
      )
    ).toThrow(/unsupported search attribute/i);
    expect(() =>
      toMarketSearchRequest(
        "product-1",
        [
          {
            key: "apiKey",
            label: "API key",
            type: "TEXT",
            required: false,
          },
        ],
        { apiKey: "secret" }
      )
    ).toThrow(/unsupported search attribute/i);
  });

  it("maps the exact fixed backend run request without provider addressing or secrets", () => {
    const body = toMarketRunRequest({
      productId: "product-1",
      attributes: {
        query: "Cabinet",
        material: "Teak",
        marketChannel: "WHOLESALE",
      },
      requestKey: "market-product-1-12345",
    });
    expect(body).toEqual({
      query: "Cabinet",
      material: "Teak",
      dimensions: undefined,
      quality: undefined,
      customization: undefined,
      packaging: undefined,
      marketChannel: "WHOLESALE",
      currency: "INR",
      country: "IN",
      maxResults: 40,
      requestKey: "market-product-1-12345",
    });
    expect(JSON.stringify(body)).not.toMatch(/url|secret|token|apiKey/i);
  });

  it("rejects unsafe source protocols and preserves backend comparability fields", () => {
    expect(safeMarketSourceUrl("javascript:alert(1)")).toBeNull();
    expect(safeMarketSourceUrl("https://merchant.example/item")).toBe(
      "https://merchant.example/item"
    );
    expect(
      toMarketComparable({
        id: "comparable-1",
        runId: "run-1",
        sourceDomain: "merchant.example",
        sourceUrl: "https://merchant.example/item",
        title: "Teak Cabinet",
        model: "TC-1",
        observedAt: "2026-10-01",
        originalCurrency: "INR",
        originalPriceMin: "120",
        originalPriceMax: "140",
        normalizedCurrency: "INR",
        normalizedPriceMin: "125",
        normalizedPriceMax: "145",
        moq: "5",
        material: "Teak",
        dimensions: "100x50 cm",
        unit: "piece",
        features: ["Hand finished"],
        seller: "Merchant",
        manufacturer: "Maker",
        marketChannel: "WHOLESALE",
        missingFields: ["shipping"],
        similarityScore: "0.91",
        confidence: "0.8",
        accepted: false,
        rejectionReason: "MOQ differs",
        algorithmVersion: "market-v1",
        freshness: "FRESH",
      })
    ).toMatchObject({
      originalPrice: { min: 120, max: 140 },
      normalizedPrice: { min: 125, max: 145 },
      moq: 5,
      channel: "WHOLESALE",
      missingFields: ["shipping"],
      decision: "EXCLUDED",
      decisionReason: "MOQ differs",
      provider: "SerpApi / Google Shopping",
      providerVersion: null,
      algorithmVersion: "market-v1",
    });
  });
});
