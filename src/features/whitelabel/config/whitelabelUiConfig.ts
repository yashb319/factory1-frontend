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
      placeholder: "acme.factory1.app",
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
    invalidDomain: "Enter a valid domain, e.g. acme.factory1.app",
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
