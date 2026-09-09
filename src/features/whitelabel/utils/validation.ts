const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
// Bare hostnames only (no scheme/path) - matches SUBDOMAIN/CUSTOM_DOMAIN values.
const DOMAIN_PATTERN =
  /^(?!-)[a-zA-Z0-9-]{1,63}(?<!-)(\.[a-zA-Z0-9-]{1,63})+$/;

export function isValidHexColor(value?: string | null): boolean {
  if (!value) return true;
  return HEX_COLOR_PATTERN.test(value.trim());
}

export function isValidUrl(value?: string | null): boolean {
  if (!value) return true;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isValidDomainValue(value?: string | null): boolean {
  if (!value) return true;
  return DOMAIN_PATTERN.test(value.trim().toLowerCase());
}
