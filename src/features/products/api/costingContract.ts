export type CostingApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T | null;
};

export function unwrapCostingEnvelope<T>(
  response: CostingApiEnvelope<T>
): T {
  if (!response.success) {
    throw new Error(response.message || "The costing request was not successful.");
  }

  if (response.data === null) {
    throw new Error(
      response.message || "The costing response did not include data."
    );
  }

  return response.data;
}

export function costingDecimal(
  value: number | string | null | undefined,
  field: string
) {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric value returned for ${field}.`);
  }

  return parsed;
}
