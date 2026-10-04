import type { RecommendationEvidence } from "../types/profitRecommendations.types";

export function recommendationEvidenceHref(
  evidence: RecommendationEvidence
): string | null {
  const productId = encodeURIComponent(evidence.productId);
  const period =
    evidence.from && evidence.to
      ? `&from=${encodeURIComponent(evidence.from)}&to=${encodeURIComponent(evidence.to)}`
      : "";

  switch (evidence.target) {
    case "PRODUCT_PROFITABILITY":
      return `/products?view=profitability&profitabilityProduct=${productId}${period}`;
    case "PRODUCT_COSTING": {
      if (!evidence.snapshotId) return null;
      return `/products?view=profitability&profitabilityProduct=${productId}&profitSimulator=open&snapshotId=${encodeURIComponent(evidence.snapshotId)}${period}`;
    }
    case "PROFIT_SIMULATOR": {
      if (!evidence.snapshotId) return null;
      const snapshot = evidence.snapshotId
        ? `&snapshotId=${encodeURIComponent(evidence.snapshotId)}`
        : "";
      return `/products?view=profitability&profitabilityProduct=${productId}&profitSimulator=open${snapshot}${period}`;
    }
    case "MARKET_EVIDENCE":
      return null;
    default:
      return null;
  }
}
