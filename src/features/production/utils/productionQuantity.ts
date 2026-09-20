const QUANTITY_SCALE = 1000;
const MAX_QUANTITY_UNITS = 999_999_999_999_999;

/** Converts NUMERIC(15,3) quantities to exact, safe-integer thousandths. */
export function productionQuantityUnits(value: string | number): number {
  if (
    (typeof value !== "string" && typeof value !== "number") ||
    (typeof value === "number" && (!Number.isFinite(value) || Object.is(value, -0)))
  ) {
    throw new Error("Enter a finite, non-negative quantity.");
  }

  const text = String(value).trim();
  if (!/^\d+(?:\.\d{1,3})?$/.test(text)) {
    throw new Error("Enter a non-negative quantity with at most 3 decimal places.");
  }

  const [whole, fraction = ""] = text.split(".");
  // Parse decimal digits, not a floating-point multiplication that can lose units.
  const units = Number(whole + fraction.padEnd(3, "0"));
  if (!Number.isSafeInteger(units) || units > MAX_QUANTITY_UNITS) {
    throw new Error("Quantity must not exceed 999999999999.999.");
  }
  return units;
}

export function parseProductionQuantity(
  value: string,
  options: { positive?: boolean } = {},
): number {
  const units = productionQuantityUnits(value);
  if (options.positive && units === 0) {
    throw new Error("Quantity must be greater than zero.");
  }
  return units / QUANTITY_SCALE;
}

export function formatProductionQuantity(value: number | null | undefined): string {
  if (typeof value !== "number") return "Unavailable";
  try {
    const units = productionQuantityUnits(value);
    const whole = Math.floor(units / QUANTITY_SCALE);
    const fraction = String(units % QUANTITY_SCALE).padStart(3, "0");
    return `${whole}.${fraction}`;
  } catch {
    return "Unavailable";
  }
}

export function sumProductionQuantities(values: readonly (string | number)[]): number {
  let total = 0;
  for (const value of values) {
    total += productionQuantityUnits(value);
    if (total > MAX_QUANTITY_UNITS) {
      throw new Error("Total quantity must not exceed 999999999999.999.");
    }
  }
  return total / QUANTITY_SCALE;
}

export function compareProductionQuantities(
  left: string | number,
  right: string | number,
): -1 | 0 | 1 {
  const leftUnits = productionQuantityUnits(left);
  const rightUnits = productionQuantityUnits(right);
  return leftUnits < rightUnits ? -1 : leftUnits > rightUnits ? 1 : 0;
}
