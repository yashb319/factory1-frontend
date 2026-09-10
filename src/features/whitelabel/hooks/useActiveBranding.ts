"use client";

import { useState } from "react";
import { useAppSelector } from "@/lib/hook";
import {
  useGetCurrentWhitelabelBrandingQuery,
  useGetPublicWhitelabelBrandingQuery,
} from "../api/whitelabelApi";
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
 * Resolves the active branding at runtime.
 *
 * - Unauthenticated (landing/login, including custom domains): the public,
 *   unauthenticated by-domain lookup keyed on the current hostname.
 * - Authenticated: the caller's own organization branding, which is the only
 *   way to brand the app shell on the shared app domain where the hostname
 *   cannot identify an organization. Falls back to the by-domain result when
 *   the authenticated lookup has no record or is unavailable. "No branding"
 *   is a successful response with a null payload, so this branches on the
 *   payload rather than on the response's `success` flag.
 *
 * Always degrades gracefully to the default Factory1 identity.
 */
export function useActiveBranding(): ActiveBranding {
  const hostname = useActiveHostname();
  const isAuthenticated = useAppSelector((state) => Boolean(state.auth.token));

  const domainQuery = useGetPublicWhitelabelBrandingQuery(hostname ?? "", {
    skip: !hostname,
  });
  const currentQuery = useGetCurrentWhitelabelBrandingQuery(undefined, {
    skip: !isAuthenticated,
  });

  const domainBranding = domainQuery.data?.data ?? null;
  const currentBranding = currentQuery.data?.data ?? null;
  const branding = currentBranding ?? domainBranding;

  const isLoading =
    !hostname ||
    domainQuery.isLoading ||
    domainQuery.isFetching ||
    (isAuthenticated && (currentQuery.isLoading || currentQuery.isFetching));

  return {
    branding,
    isLoading,
    displayName: branding?.displayName || branding?.organizationName || DEFAULT_APP_NAME,
    logoUrl: branding?.logoUrl || null,
    faviconUrl: branding?.faviconUrl || DEFAULT_FAVICON_URL,
    primaryColorHex: branding?.primaryColorHex || DEFAULT_PRIMARY_COLOR_HEX,
    accentColorHex: branding?.accentColorHex || DEFAULT_ACCENT_COLOR_HEX,
  };
}
