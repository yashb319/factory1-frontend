import type { UserRole } from "@/features/auth/types";
import type { WhitelabelDomainType } from "../types/whitelabel.types";

export const WHITELABEL_DEFAULT_BRANDING = {
  appName: "Factory1",
  appTitle: "Factory1 - AI first ERP",
  faviconUrl: "/icon.svg",
  primaryColorHex: "#2563eb",
  accentColorHex: "#0ea5e9",
  shellTagline: "Operations OS",
} as const;

export const WHITELABEL_ACCESS = {
  partnerAdminRole: "PARTNER_ADMIN" satisfies UserRole,
  platformAdminName: "Factory1 platform administrators",
} as const;

/**
 * Display-only domain configuration. These values never drive routing or API
 * calls - they only shape the copy shown in the white-label admin forms so the
 * environment the app is deployed to is described accurately.
 */
const SHARED_DOMAIN_FALLBACKS = {
  production: "factory1.in",
  local: "localhost",
} as const;

const SUBDOMAIN_EXAMPLE_TOKEN = "your-brand";
const CUSTOM_DOMAIN_EXAMPLE_FALLBACK = "erp.your-company.com";

function isLocalHostname(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local")
  );
}

/**
 * Resolves the shared app domain used for display copy. Prefers the explicit
 * env override, then falls back to a local or production default based on the
 * environment the UI is currently running in.
 */
export function getSharedAppDomain(): string {
  const configured = process.env.NEXT_PUBLIC_FACTORY1_SHARED_DOMAIN?.trim();
  if (configured) return configured;

  if (typeof window !== "undefined" && isLocalHostname(window.location.hostname)) {
    return window.location.host || SHARED_DOMAIN_FALLBACKS.local;
  }

  return process.env.NODE_ENV === "production"
    ? SHARED_DOMAIN_FALLBACKS.production
    : SHARED_DOMAIN_FALLBACKS.local;
}

/** Example subdomain shown as placeholder/help text, e.g. `your-brand.factory1.in`. */
export function getSubdomainExample(): string {
  const configured = process.env.NEXT_PUBLIC_FACTORY1_SUBDOMAIN_EXAMPLE?.trim();
  if (configured) return configured;

  return `${SUBDOMAIN_EXAMPLE_TOKEN}.${getSharedAppDomain()}`;
}

/** Example customer-owned domain shown as placeholder/help text. */
export function getCustomDomainExample(): string {
  return (
    process.env.NEXT_PUBLIC_FACTORY1_CUSTOM_DOMAIN_EXAMPLE?.trim() ||
    CUSTOM_DOMAIN_EXAMPLE_FALLBACK
  );
}

/** Example domain for the given domain type, used in placeholders and hints. */
export function getDomainExample(domainType: WhitelabelDomainType): string {
  if (domainType === "SHARED") return getSharedAppDomain();
  if (domainType === "SUBDOMAIN") return getSubdomainExample();
  return getCustomDomainExample();
}

export const WHITELABEL_DOMAIN_OPTIONS: ReadonlyArray<{
  value: WhitelabelDomainType;
  label: string;
  description: string;
}> = [
  {
    value: "SHARED",
    label: "Shared",
    description: "Use the default shared app domain.",
  },
  {
    value: "SUBDOMAIN",
    label: "Subdomain",
    description: "Route a branded subdomain managed by Factory1.",
  },
  {
    value: "CUSTOM_DOMAIN",
    label: "Custom domain",
    description: "Route a customer-owned verified domain.",
  },
] as const;

/**
 * Domain-type description resolved against the configured environment so a
 * SHARED selection names the actual shared app domain instead of an example.
 */
export function getWhitelabelDomainDescription(
  domainType: WhitelabelDomainType
): string {
  const base = getWhitelabelDomainOption(domainType).description;

  if (domainType === "SHARED") {
    return `${base} Organizations sign in at ${getSharedAppDomain()}, so no domain value is needed.`;
  }

  return `${base} Example: ${getDomainExample(domainType)}`;
}

export const WHITELABEL_FORM_COPY = {
  fields: {
    displayName: {
      label: "Display name",
      placeholder: "Organization display name",
    },
    logoUrl: {
      label: "Logo URL",
      placeholder: "https://cdn.example.com/logo.png",
    },
    faviconUrl: {
      label: "Favicon URL",
      placeholder: "https://cdn.example.com/favicon.ico",
    },
    primaryColorHex: {
      label: "Primary color",
      placeholder: "#2563EB",
    },
    accentColorHex: {
      label: "Accent color",
      placeholder: "#0EA5E9",
    },
    domainType: {
      label: "Domain type",
    },
    domainValue: {
      label: "Domain value",
      sharedLabel: "Shared app domain",
      sharedHelp:
        "Shared organizations are served from the default app domain. Domain value is managed by Factory1 and cannot be edited.",
    },
    partnerName: {
      label: "Partner name",
      placeholder: "Regional Partner",
    },
    partnerCode: {
      label: "Partner code",
      placeholder: "REGION-01",
    },
    partnerUserId: {
      label: `Linked user ID (${WHITELABEL_ACCESS.partnerAdminRole})`,
      placeholder: "UUID of the partner admin user",
    },
  },
  validation: {
    colors: "Colors must be valid hex values like #2563EB",
    urls: "Logo and favicon must be valid http(s) URLs",
    missingDomain: "Enter a domain value for a subdomain or custom domain",
    invalidDomain: "Enter a valid domain",
    partnerRequired: "Partner name, code and linked user ID are required",
  },
} as const;

export const WHITELABEL_PAGE_COPY = {
  saasTitle: "White Label",
  saasDescription:
    "Configure organization branding, custom domains and reseller partners.",
  partnerTitle: "Partner White Label",
  partnerDescription:
    "Update the visible brand for the organizations linked to your partner account.",
  partnerRestriction:
    "Domain verification and enabling/disabling an organization's branding are SaaS-owner-only controls. Those toggles are not shown here, and the server rejects them even if sent.",
} as const;

export const WHITELABEL_PARTNER_FORM_DEFAULTS = {
  name: "",
  code: "",
  userId: "",
  active: true,
} as const;

export function getWhitelabelDomainOption(value: WhitelabelDomainType) {
  return (
    WHITELABEL_DOMAIN_OPTIONS.find((option) => option.value === value) ??
    WHITELABEL_DOMAIN_OPTIONS[0]
  );
}

/** Placeholder for the domain value input, driven by the selected domain type. */
export function getDomainValuePlaceholder(
  domainType: WhitelabelDomainType
): string {
  return getDomainExample(domainType);
}

/** Validation message for an invalid domain, with an environment-aware example. */
export function getInvalidDomainMessage(
  domainType: WhitelabelDomainType
): string {
  return `${WHITELABEL_FORM_COPY.validation.invalidDomain}, e.g. ${getDomainExample(domainType)}`;
}

/**
 * Domain value shown in read-only lists. SHARED organizations are served from
 * the configured shared app domain, so show that instead of an empty value.
 */
export function getDomainValueDisplay(
  domainType: WhitelabelDomainType,
  domainValue?: string | null
): string {
  if (domainType === "SHARED") return getSharedAppDomain();
  return domainValue?.trim() || "—";
}
