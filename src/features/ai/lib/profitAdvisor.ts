import type { AuthUser } from "@/features/auth/types";
import type {
  AiActionProposal,
  AiModuleContext,
  AiQuickQuestion,
} from "../types/ai.types";

const PROFIT_ADVISOR_ROLES = new Set([
  "OWNER",
  "ADMIN",
  "FINANCE",
  "MANAGEMENT",
]);
const SAFE_PROFIT_ACTIONS = new Set([
  "open-profitability",
  "open-profit-simulator",
]);

export function canUseProfitAdvisor(
  user: AuthUser | null | undefined,
  enabledFeatures: readonly string[] | undefined | null
) {
  return Boolean(
    user &&
      !user.platformAdmin &&
      PROFIT_ADVISOR_ROLES.has(user.role) &&
      enabledFeatures?.includes("ai_assistant") &&
      enabledFeatures.includes("product_costing")
  );
}

export function filterProfitQuickQuestions(
  questions: AiQuickQuestion[],
  profitAdvisorEnabled: boolean
) {
  return profitAdvisorEnabled
    ? questions
    : questions.filter((question) => question.module !== "PROFIT");
}

export function moduleContextFromRoute(
  pathname: string,
  searchParams?: Pick<URLSearchParams, "get">
): AiModuleContext | null {
  if (
    pathname === "/products" &&
    searchParams?.get("view") === "profitability"
  ) {
    return "PROFIT";
  }
  return null;
}

export function getSafeProfitNavigationRoute(
  action: AiActionProposal
): string | null {
  if (
    action.actionType !== "NAVIGATE" ||
    action.displayOnly !== true ||
    !SAFE_PROFIT_ACTIONS.has(action.id) ||
    !action.route
  ) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(action.route, "https://factory1.local");
  } catch {
    return null;
  }

  if (url.origin !== "https://factory1.local" || url.pathname !== "/products") {
    return null;
  }
  if (url.searchParams.get("view") !== "profitability") {
    return null;
  }
  if (
    action.id === "open-profit-simulator" &&
    (url.searchParams.get("profitSimulator") !== "open" ||
      !url.searchParams.get("profitabilityProduct"))
  ) {
    return null;
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

export function productProfitabilityRoute(productId: string) {
  const search = new URLSearchParams({
    view: "profitability",
    profitabilityProduct: productId,
  });
  return `/products?${search.toString()}`;
}

export function productCostingRoute(productId: string, snapshotId?: string | null) {
  const search = new URLSearchParams({ costingProduct: productId });
  if (snapshotId) search.set("snapshotId", snapshotId);
  return `/products?${search.toString()}`;
}
