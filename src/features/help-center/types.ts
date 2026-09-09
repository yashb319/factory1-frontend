import type { ComponentType, CSSProperties } from "react";
import type { UserRole } from "@/features/auth/types";
import type { ModuleKey } from "@/config/theme";

/**
 * Help Center content model.
 *
 * Every user-facing module guide lives in `content/guides.ts` and follows this
 * shape so product changes have exactly one typed place to update.
 */

export type HelpVideoProvider = "youtube" | "vimeo";

export type HelpVideo = {
  title: string;
  /**
   * Public watch/share URL. The page only renders an iframe when the URL
   * resolves to an allow-listed embed host (see `resolveVideoEmbedUrl`).
   * Leave `video` undefined on a guide to show the "coming soon" placeholder.
   */
  url: string;
  provider: HelpVideoProvider;
  durationLabel?: string;
};

export type HelpStep = {
  title: string;
  detail: string;
};

export type HelpField = {
  name: string;
  description: string;
};

export type HelpTroubleshooting = {
  problem: string;
  fix: string;
};

export type HelpRelatedRoute = {
  label: string;
  href: string;
};

export type HelpGuide = {
  /** Stable kebab-case id. Used for anchors (`#<id>`) and `?module=` deep links. */
  id: string;
  title: string;
  /** Primary in-app route this guide documents. */
  route: string;
  /** Module theme key used for icon colors, shared with the sidebar. */
  module: ModuleKey;
  icon: ComponentType<{ className?: string; size?: number; style?: CSSProperties }>;
  /** One-line card blurb shown in search results and module cards. */
  summary: string;
  /** Extra search terms that do not appear in the visible copy. */
  keywords: string[];
  /** Roles that can access the module. Guides are hidden from other roles. */
  roles: UserRole[];
  purpose: string;
  prerequisites: string[];
  steps: HelpStep[];
  keyFields: HelpField[];
  statuses?: HelpField[];
  troubleshooting: HelpTroubleshooting[];
  relatedRoutes: HelpRelatedRoute[];
  video?: HelpVideo;

  /* ---- Content maintenance metadata (see content/catalog.ts) ---- */
  /** Team or role accountable for keeping this guide accurate. */
  contentOwner: string;
  /** Semver-ish content revision. Bump on every meaningful guide change. */
  contentVersion: string;
  /** ISO date (YYYY-MM-DD) when the guide copy was last verified against the app. */
  lastUpdated: string;
  /** ISO date by which the guide must be re-verified. Past due => stale badge. */
  reviewBy: string;
};

export type HelpCatalogEntry = {
  guideId: string;
  title: string;
  route: string;
  contentOwner: string;
  contentVersion: string;
  lastUpdated: string;
  reviewBy: string;
};
