import type { MaterialAvailability, MaterialAvailabilityItem } from "../types/productionFlow.types";

export function materialAvailabilityPageError(
  page: MaterialAvailability,
  pageNumber: number,
  first: MaterialAvailability | undefined,
  collected: MaterialAvailabilityItem[],
): string | undefined {
  if (!page || !Array.isArray(page.items) || !page.rootOrderId ||
      !Number.isSafeInteger(page.familyVersion) || page.familyVersion < 0 ||
      !Number.isInteger(page.page) || page.page !== pageNumber ||
      !Number.isInteger(page.size) || page.size < 1 || page.size > 200 ||
      !Number.isSafeInteger(page.totalElements) || page.totalElements < 0 ||
      !Number.isInteger(page.totalPages) || page.totalPages !== Math.ceil(page.totalElements / page.size)) {
    return "Material evidence pagination is incomplete or invalid. Refresh before reviewing stock allocations.";
  }
  if (first && (page.rootOrderId !== first.rootOrderId || page.familyVersion !== first.familyVersion ||
      page.size !== first.size || page.totalElements !== first.totalElements || page.totalPages !== first.totalPages)) {
    return "Material evidence changed between pages. Refresh and review the family again.";
  }
  const expectedCount = Math.min(page.size, Math.max(0, page.totalElements - page.page * page.size));
  const ids = new Set(collected.map((item) => item.consumptionId));
  if (page.items.length !== expectedCount || page.items.some((item) => {
    if (!item.consumptionId || ids.has(item.consumptionId)) return true;
    ids.add(item.consumptionId);
    return false;
  })) {
    return "Material evidence has missing or repeated rows. Refresh before reviewing stock allocations.";
  }
}
