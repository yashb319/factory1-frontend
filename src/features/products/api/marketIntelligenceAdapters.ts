import type {
  MarketAvailability,
  MarketComparable,
  MarketIntelligenceView,
  MarketRun,
  MarketSearchAttributeDefinition,
  MarketSearchRequest,
  MarketSummary,
} from "../types/marketIntelligence.types";
import type {
  MarketAvailabilityDto,
  MarketComparableDto,
  MarketComparablesPageDto,
  MarketSearchRunDto,
  MarketSummaryDto,
} from "../types/marketIntelligenceApi.types";
import { costingDecimal } from "./costingContract";

const UNSAFE_ATTRIBUTE_KEY = /(url|uri|endpoint|host|secret|token|password|credential|api.?key)/i;

export function toMarketSearchRequest(
  productId: string,
  definitions: readonly MarketSearchAttributeDefinition[],
  values: Readonly<Record<string, string>>
): MarketSearchRequest {
  if (!productId) {
    throw new Error("A product is required before market evidence can be searched.");
  }

  const attributes: Record<string, string | number> = {};

  definitions.forEach((definition) => {
    if (UNSAFE_ATTRIBUTE_KEY.test(definition.key)) {
      throw new Error(`The server exposed an unsupported search attribute: ${definition.label}.`);
    }

    const raw = values[definition.key]?.trim() ?? "";
    if (!raw) {
      if (definition.required) {
        throw new Error(`${definition.label} is required.`);
      }
      return;
    }

    if (definition.type === "TEXT") {
      const maxLength = Math.min(definition.maxLength ?? 120, 500);
      if (raw.length > maxLength) {
        throw new Error(`${definition.label} must be ${maxLength} characters or fewer.`);
      }
      attributes[definition.key] = raw;
      return;
    }

    if (definition.type === "SELECT") {
      if (!definition.options?.some((option) => option.value === raw)) {
        throw new Error(`${definition.label} is not a supported option.`);
      }
      attributes[definition.key] = raw;
      return;
    }

    const value = Number(raw);
    if (!Number.isFinite(value)) {
      throw new Error(`${definition.label} must be a number.`);
    }
    if (definition.min != null && value < definition.min) {
      throw new Error(`${definition.label} must be at least ${definition.min}.`);
    }
    if (definition.max != null && value > definition.max) {
      throw new Error(`${definition.label} must be at most ${definition.max}.`);
    }
    attributes[definition.key] = value;
  });

  return {
    productId,
    attributes,
    requestKey: createMarketRequestKey(productId),
  };
}

export function safeMarketSourceUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export function toMarketSearchDefinitions(
    availability: MarketAvailabilityDto,
    productName: string
  ): MarketSearchAttributeDefinition[] {
    const definitions: MarketSearchAttributeDefinition[] = [
      {
        key: "query",
        label: "Search query",
        type: "TEXT",
        required: false,
        maxLength: Math.min(availability.catalog.maxQueryLength, 300),
        initialValue: productName,
      },
    ];
    const labels: Record<string, string> = {
      material: "Material",
      dimensions: "Dimensions",
      quality: "Quality",
      customization: "Customization",
      packaging: "Packaging",
      marketChannel: "Market channel",
    };
    availability.catalog.attributes.forEach((key) => {
      if (!labels[key]) return;
      definitions.push({
        key,
        label: labels[key],
        type: key === "marketChannel" ? "SELECT" : "TEXT",
        required: false,
        maxLength: key === "marketChannel" ? 40 : 120,
        options:
          key === "marketChannel"
            ? availability.catalog.channels.map((channel) => ({
                value: channel,
                label: channel.toLowerCase(),
              }))
            : undefined,
      });
    });
    return definitions;
  }

export function toMarketAvailability(
    availability: MarketAvailabilityDto,
    hasRuns: boolean,
    latestRun?: MarketSearchRunDto,
    summary?: MarketSummaryDto
  ): MarketAvailability {
    if (!availability.entitled || !availability.productCostingEntitled) {
      return "ENTITLEMENT_REQUIRED";
    }
    if (availability.reasonCode === "PROVIDER_DISABLED") {
      return "PROVIDER_DISABLED";
    }
    if (
      availability.reasonCode === "PROVIDER_NOT_CONFIGURED"
    ) {
      return "PROVIDER_MISCONFIGURED";
    }
    if (
      availability.reasonCode === "PROVIDER_UNHEALTHY" ||
      availability.status === "CIRCUIT_OPEN"
    ) {
      return "PROVIDER_UNHEALTHY";
    }
    if (latestRun?.status === "PENDING" || latestRun?.status === "RUNNING") {
      return "RUNNING";
    }
    if (latestRun?.status === "FAILED" || latestRun?.status === "UNAVAILABLE") {
      return "FAILED";
    }
    if (summary?.freshness === "EXPIRED") return "EXPIRED";
    if (summary?.freshness === "STALE") return "STALE";
    if (summary?.reasonCode) return "INSUFFICIENT_COMPARABLES";
    return hasRuns ? "AVAILABLE" : "NO_DATA";
  }

export function toMarketComparable(dto: MarketComparableDto): MarketComparable {
    const originalMin = costingDecimal(dto.originalPriceMin, "originalPriceMin");
    const originalMax = costingDecimal(dto.originalPriceMax, "originalPriceMax");
    const normalizedMin = costingDecimal(
      dto.normalizedPriceMin,
      "normalizedPriceMin"
    );
    const normalizedMax = costingDecimal(
      dto.normalizedPriceMax,
      "normalizedPriceMax"
    );
    return {
      id: dto.id,
      sourceName: dto.sourceDomain,
      sourceUrl: safeMarketSourceUrl(dto.sourceUrl),
      observedAt: dto.observedAt,
      freshness: dto.freshness,
      title: dto.title,
      model: dto.model,
      originalPrice: {
        currency: dto.originalCurrency,
        min: originalMin,
        max: originalMax,
        value: originalMin === originalMax ? originalMin : undefined,
      },
      normalizedPrice: dto.normalizedCurrency
        ? {
            currency: dto.normalizedCurrency,
            min: normalizedMin,
            max: normalizedMax,
            value: normalizedMin === normalizedMax ? normalizedMin : undefined,
          }
        : null,
      moq: costingDecimal(dto.moq, "moq"),
      channel:
        dto.marketChannel === "WHOLESALE" || dto.marketChannel === "RETAIL"
          ? dto.marketChannel
          : "UNKNOWN",
      material: dto.material,
      dimensions: dto.dimensions,
      features: dto.features ?? [],
      similarity: costingDecimal(dto.similarityScore, "similarityScore"),
      confidence: costingDecimal(dto.confidence, "confidence"),
      missingFields: dto.missingFields ?? [],
      decision: dto.accepted ? "ACCEPTED" : "EXCLUDED",
      decisionReason: dto.rejectionReason,
      provider: "SerpApi / Google Shopping",
      providerVersion: null,
      algorithmVersion: dto.algorithmVersion,
      limitations: [
        dto.unit ? `Listed unit: ${dto.unit}` : null,
        dto.seller ? `Seller: ${dto.seller}` : null,
        dto.manufacturer ? `Manufacturer: ${dto.manufacturer}` : null,
      ].filter((entry): entry is string => Boolean(entry)),
    };
  }

export function toMarketSummary(dto: MarketSummaryDto): MarketSummary | null {
    if (!dto.range) return null;
    return {
      range: {
        currency: dto.currency,
        min: costingDecimal(dto.range.low, "range.low"),
        max: costingDecimal(dto.range.high, "range.high"),
      },
      median: {
        currency: dto.currency,
        value: costingDecimal(dto.range.median, "range.median"),
      },
      sampleCount: dto.range.sampleCount,
      confidence: costingDecimal(dto.confidence, "confidence"),
      method: `${dto.range.method}${
        dto.range.mixedChannels ? " across mixed channels" : ""
      }${dto.range.channel ? ` for ${dto.range.channel}` : ""}`,
      outlierExclusions: dto.range.outlierCount,
      limitations: [
        dto.disclaimer,
        dto.freshness ? `Freshness: ${dto.freshness}` : null,
        dto.observedFrom || dto.observedTo
          ? `Observed ${dto.observedFrom ?? "unknown"} to ${dto.observedTo ?? "unknown"}`
          : null,
        dto.sources.length ? `Sources: ${dto.sources.join(", ")}` : null,
        dto.missingFields.length
          ? `Missing fields: ${dto.missingFields.join(", ")}`
          : null,
      ].filter((entry): entry is string => Boolean(entry)),
    };
  }

export function toMarketRun(dto: MarketSearchRunDto): MarketRun {
    const metadata = dto.metadata ?? {};
    const searchedAttributes: Record<string, string | number> = {};
    Object.entries({ query: dto.query, ...metadata }).forEach(([key, value]) => {
      if (typeof value === "string" || typeof value === "number") {
        searchedAttributes[key] = value;
      }
    });
    return {
      id: dto.id,
      status: dto.status,
      startedAt: dto.startedAt,
      completedAt: dto.completedAt,
      provider:
        dto.provider === "SERPAPI_GOOGLE_SHOPPING"
          ? "SerpApi / Google Shopping"
          : null,
      providerVersion: null,
      algorithmVersion: dto.algorithmVersion,
      errorCode: dto.errorCode,
      resultCount: dto.resultCount,
      acceptedCount: dto.acceptedCount,
      safeError: dto.safeError,
      searchedAttributes,
    };
  }

export function toMarketIntelligenceView({
    availability,
    productName,
    runs,
    comparables,
    summary,
  }: {
    availability: MarketAvailabilityDto;
    productName: string;
    runs: MarketSearchRunDto[];
    comparables: MarketComparablesPageDto;
    summary?: MarketSummaryDto;
  }): MarketIntelligenceView {
    const latestRun = runs[0];
    return {
      availability: toMarketAvailability(
        availability,
        runs.length > 0,
        latestRun,
        summary
      ),
      message: availabilityMessage(availability, summary),
      lastUpdatedAt: latestRun?.completedAt ?? latestRun?.startedAt,
      expiresAt: latestRun?.expiresAt,
      searchAttributes: toMarketSearchDefinitions(availability, productName),
      searchedAttributes: toMarketRun(latestRun ?? emptyRun()).searchedAttributes,
      summary: summary ? toMarketSummary(summary) : null,
      comparables: comparables.content.map(toMarketComparable),
      page: comparables.page,
      size: comparables.size,
      totalElements: comparables.totalElements,
      totalPages: comparables.totalPages,
      runs: runs.map(toMarketRun),
      advisorEvidence: null,
    };
  }

function createMarketRequestKey(productId: string) {
    const suffix =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return `market-${productId}-${suffix}`.slice(0, 120);
  }

function availabilityMessage(
    availability: MarketAvailabilityDto,
    summary?: MarketSummaryDto
  ) {
    if (!availability.productCostingEntitled) {
      return "Product Costing must be enabled before Market Intelligence can be used.";
    }
    if (!availability.entitled) {
      return "This organization does not have the Market Intelligence entitlement.";
    }
    if (summary?.reasonCode === "CURRENCY_MISMATCH") {
      return "Accepted observations use incompatible currencies, so the server did not return a range.";
    }
    if (summary?.reasonCode === "NO_FRESH_COMPARABLES") {
      return "No accepted observations are currently fresh enough for a server-returned range.";
    }
    return null;
  }

function emptyRun(): MarketSearchRunDto {
    return {
      id: "",
      productId: "",
      provider: null,
      requestHash: "",
      status: "PENDING",
      errorCode: "NONE",
      resultCount: 0,
      acceptedCount: 0,
    };
}
