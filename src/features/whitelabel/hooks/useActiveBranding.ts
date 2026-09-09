"use client";

import { useState } from "react";
import { useGetPublicWhitelabelBrandingQuery } from "../api/whitelabelApi";
import { WHITELABEL_DEFAULT_BRANDING } from "../config/whitelabelUiConfig";
import type { PublicWhitelabelBranding } from "../types/whitelabel.types";

export const DEFAULT_APP_NAME = WHITELABEL_DEFAULT_BRANDING.appName;
export const DEFAULT_APP_TITLE = WHITELABEL_DEFAULT_BRANDING.appTitle;
export const DEFAULT_FAVICON_URL = WHITELABEL_DEFAULT_BRANDING.faviconUrl;
export const DEFAULT_PRIMARY_COLOR_HEX =
  WHITELABEL_DEFAULT_BRANDING.primaryColorHex;
export const DEFAULT_ACCENT_COLOR_HEX =
  WHITELABEL_DEFAULT_BRANDING.accentColorHex;

/**
 * Resolves the hostname the app is currently served from. Returns null
 * until mounted on the client so the branding lookup never runs during SSR.
 */
function useActiveHostname(): string | null {
  const [hostname] = useState<string | null>(() =>
    typeof window !== "undefined" ? window.location.hostname : null
  );

  return hostname;
}

export type ActiveBranding = {
  branding: PublicWhitelabelBranding | null;
  isLoading: boolean;
  displayName: string;
  logoUrl: string | null;
  faviconUrl: string;
  primaryColorHex: string;
  accentColorHex: string;
};

/**
 * Resolves the active org branding for the current hostname via the public,
 * unauthenticated by-domain lookup. Gracefully falls back to the default
 * Factory1 identity when there is no record, the lookup fails, or the app
 * is running on a shared/default domain.
 */
export function useActiveBranding(): ActiveBranding {
  const hostname = useActiveHostname();
  const { data, isLoading, isFetching } = useGetPublicWhitelabelBrandingQuery(
    hostname ?? "",
    { skip: !hostname }
  );

  const branding = data?.data ?? null;

  return {
    branding,
    isLoading: !hostname || isLoading || isFetching,
    displayName: branding?.displayName || branding?.organizationName || DEFAULT_APP_NAME,
    logoUrl: branding?.logoUrl || null,
    faviconUrl: branding?.faviconUrl || DEFAULT_FAVICON_URL,
    primaryColorHex: branding?.primaryColorHex || DEFAULT_PRIMARY_COLOR_HEX,
    accentColorHex: branding?.accentColorHex || DEFAULT_ACCENT_COLOR_HEX,
  };
}
