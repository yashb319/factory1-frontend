const supportedCurrencies =
  typeof Intl.supportedValuesOf === "function"
    ? new Set(Intl.supportedValuesOf("currency"))
    : null;

export function normalizeCurrencyCode(
  currency: string | null | undefined
): string | null {
  const normalized = currency?.trim().toUpperCase();
  if (!normalized || !/^[A-Z]{3}$/.test(normalized)) return null;
  if (supportedCurrencies && !supportedCurrencies.has(normalized)) return null;

  try {
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: normalized,
    });
    return normalized;
  } catch {
    return null;
  }
}

export function formatCurrencyValue(
  value: number | null | undefined,
  currency: string | null | undefined
) {
  const normalizedCurrency = normalizeCurrencyCode(currency);
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value) ||
    !normalizedCurrency
  ) {
    return "Not available";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: normalizedCurrency,
    maximumFractionDigits: 2,
  }).format(value);
}
