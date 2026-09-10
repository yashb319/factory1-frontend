export type ApiResponse<T> = {
  success: boolean;
  message?: string | null;
  data: T;
};

export type WhitelabelDomainType = "SHARED" | "SUBDOMAIN" | "CUSTOM_DOMAIN";

export type WhitelabelOrganization = {
  organizationId: string;
  organizationName: string;
  displayName?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  primaryColorHex?: string | null;
  accentColorHex?: string | null;
  domainType: WhitelabelDomainType;
  domainValue?: string | null;
  domainVerified: boolean;
  active: boolean;
  partnerName?: string | null;
  partnerCode?: string | null;
};

/**
 * Payload accepted by the SaaS admin update endpoint. Every field is
 * optional so the UI can send a partial patch of only the edited fields.
 */
export type WhitelabelOrganizationAdminUpdateRequest = {
  displayName?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  primaryColorHex?: string | null;
  accentColorHex?: string | null;
  domainType?: WhitelabelDomainType;
  domainValue?: string | null;
  domainVerified?: boolean;
  active?: boolean;
};

/**
 * Payload accepted by the partner-scoped update endpoint. Partners cannot
 * verify custom domains or (de)activate an organization's branding - the
 * backend is the source of truth and rejects/ignores those fields, but we
 * keep the type narrow so the UI never attempts to send them.
 */
export type WhitelabelOrganizationPartnerUpdateRequest = {
  displayName?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  primaryColorHex?: string | null;
  accentColorHex?: string | null;
  domainType?: WhitelabelDomainType;
  domainValue?: string | null;
};

export type WhitelabelPartner = {
  id: string;
  name: string;
  code: string;
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  active: boolean;
  createdAt?: string | null;
};

export type WhitelabelPartnerRequest = {
  name: string;
  code: string;
  userId: string;
  active?: boolean;
};

/**
 * Branding payload returned by the runtime branding lookups (public by-domain
 * and authenticated current-organization). Only branding fields are exposed;
 * organization identity fields are optional because the public endpoint omits
 * them.
 */
export type PublicWhitelabelBranding = {
  organizationId?: string | null;
  organizationName?: string | null;
  displayName?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  primaryColorHex?: string | null;
  accentColorHex?: string | null;
  domainType?: WhitelabelDomainType;
  domainValue?: string | null;
};

/**
 * Result of the public partner-code lookup used by the signup form. A miss is a
 * definite answer rather than absent config, so unknown or inactive codes come
 * back as a successful response with `valid: false` - callers must branch on
 * `valid`, never on the envelope's `success`.
 */
export type PartnerCodeValidation = {
  valid: boolean;
  partnerName: string | null;
};
