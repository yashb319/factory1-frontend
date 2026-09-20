const UUID_SOURCE = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const UUID = new RegExp(`^${UUID_SOURCE}$`, "i");
const ORDER_PATH = new RegExp(`^/production\\?orderId=(${UUID_SOURCE})$`, "i");
const MAX_INPUT_LENGTH = 2048;

function normalizeUuid(orderId: string): string {
  if (orderId.length !== 36 || !UUID.test(orderId)) {
    throw new Error("Enter a valid order UUID.");
  }
  return orderId.toLowerCase();
}

function normalizedOrigin(origin: string): string {
  if (
    origin.length > MAX_INPUT_LENGTH ||
    /[@\\\s%]/.test(origin) ||
    !/^https?:\/\/[^/?#\\\s%]+\/?$/i.test(origin)
  ) {
    throw new Error("The application origin must be an HTTP or HTTPS origin.");
  }
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    throw new Error("The application origin is invalid.");
  }
  if (url.username || url.password || url.origin === "null") {
    throw new Error("The application origin must not contain credentials.");
  }
  return url.origin;
}

/** Stable identifier only: never add order details, credentials, or lifecycle state. */
export function productionOrderPath(orderId: string): string {
  return `/production?orderId=${normalizeUuid(orderId)}`;
}

export function productionOrderUrl(orderId: string, origin: string): string {
  return normalizedOrigin(origin) + productionOrderPath(orderId);
}

export function parseProductionOrderInput(input: string, origin: string): string {
  const expectedOrigin = normalizedOrigin(origin);
  if (input.length > MAX_INPUT_LENGTH) {
    throw new Error("The scanned value is too long. Use an order QR code or UUID.");
  }
  // Reject URL-parser normalization (escapes, backslashes, and control characters).
  if (/[%\\\u0000-\u001f\u007f]/.test(input)) {
    throw new Error("Use an unencoded, canonical production order link or UUID.");
  }
  const value = input.trim();
  if (UUID.test(value)) return normalizeUuid(value);

  let path = value;
  if (/^https?:\/\//i.test(value)) {
    const fullLink = /^(https?:\/\/[^/?#]+)(\/.*)$/i.exec(value);
    if (!fullLink) throw new Error("Use a canonical production order link.");
    if (normalizedOrigin(fullLink[1]) !== expectedOrigin) {
      throw new Error("This QR code belongs to a different site.");
    }
    path = fullLink[2];
  }
  const match = ORDER_PATH.exec(path);
  // UUIDs are case-insensitive; route and parameter names are not.
  if (!match || match[0] !== path || !path.startsWith("/production?orderId=")) {
    throw new Error("Use /production?orderId=UUID, a same-site order URL, or a bare UUID.");
  }
  return normalizeUuid(match[1]);
}

/** An allowlist, not a general-purpose redirect sanitizer. Never accepts absolute URLs. */
export function safeProductionReturnPath(next: string | null | undefined): string | undefined {
  if (!next || next.length > MAX_INPUT_LENGTH) return undefined;
  if (next === "/production") return next;
  const match = ORDER_PATH.exec(next);
  if (!match || match[0] !== next || !next.startsWith("/production?orderId=")) return undefined;
  return productionOrderPath(match[1]);
}

export function productionLoginPath(path: string): string {
  const next = safeProductionReturnPath(path);
  return next ? `/login?next=${encodeURIComponent(next)}` : "/login";
}
