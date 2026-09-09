"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import {
  useActiveBranding,
  DEFAULT_APP_TITLE,
  DEFAULT_APP_NAME,
  DEFAULT_FAVICON_URL,
  DEFAULT_PRIMARY_COLOR_HEX,
  DEFAULT_ACCENT_COLOR_HEX,
} from "../hooks/useActiveBranding";
import type { PublicWhitelabelBranding } from "../types/whitelabel.types";

export type BrandingContextValue = {
  branding: PublicWhitelabelBranding | null;
  isLoading: boolean;
  displayName: string;
  logoUrl: string | null;
  faviconUrl: string;
  primaryColorHex: string;
  accentColorHex: string;
};

const BrandingContext = createContext<BrandingContextValue>({
  branding: null,
  isLoading: true,
  displayName: DEFAULT_APP_NAME,
  logoUrl: null,
  faviconUrl: DEFAULT_FAVICON_URL,
  primaryColorHex: DEFAULT_PRIMARY_COLOR_HEX,
  accentColorHex: DEFAULT_ACCENT_COLOR_HEX,
});

type BrandingProviderProps = {
  children: ReactNode;
};

/**
 * Applies the active org's white-label branding (title, favicon and theme
 * colors) globally at runtime. Renders children unchanged - this is a side
 * effect-only wrapper, not a visual one, so it never blocks the app shell.
 */
export function BrandingProvider({ children }: BrandingProviderProps) {
  const brandingState = useActiveBranding();
  const value = useMemo(() => brandingState, [brandingState]);

  useEffect(() => {
    const title = brandingState.branding?.displayName || brandingState.branding?.organizationName
      ? brandingState.displayName
      : DEFAULT_APP_TITLE;

    document.title = title;
  }, [brandingState.branding?.displayName, brandingState.branding?.organizationName, brandingState.displayName]);

  useEffect(() => {
    const links = document.querySelectorAll<HTMLLinkElement>(
      "link[rel~='icon']"
    );

    if (links.length) {
      links.forEach((link) => {
        link.href = brandingState.faviconUrl;
      });
    } else {
      const link = document.createElement("link");
      link.rel = "icon";
      link.href = brandingState.faviconUrl;
      document.head.appendChild(link);
    }
  }, [brandingState.faviconUrl]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--factory1-primary", brandingState.primaryColorHex);
    root.style.setProperty("--factory1-accent", brandingState.accentColorHex);
  }, [brandingState.primaryColorHex, brandingState.accentColorHex]);

  return (
    <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
