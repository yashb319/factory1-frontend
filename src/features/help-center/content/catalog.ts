import type { UserRole } from "@/features/auth/types";
import type { HelpCatalogEntry, HelpGuide, HelpVideo } from "../types";
import { helpGuides } from "./guides";

/**
 * Central Help Center catalog.
 *
 * This module is the maintenance surface for help content:
 *
 * UPDATE CHECKLIST (run when any module changes):
 * 1. Open the matching guide in `./guides.ts` and update purpose, steps,
 *    fields, statuses, troubleshooting and routes to match the shipped UI.
 * 2. Bump the guide's `contentVersion` (e.g. 1.0.0 -> 1.1.0).
 * 3. Set `lastUpdated` to today and extend `reviewBy` (default: +3 months).
 * 4. If module routes or role access changed, also update
 *    `src/config/navigation.ts` so the sidebar stays consistent.
 * 5. Run `npm run lint` and `npm run build` before merging.
 *
 * `getStaleGuides()` returns every guide whose `reviewBy` date has passed —
 * the Help Center page surfaces these with a "Needs review" badge.
 */

/** How long a guide is trusted after `lastUpdated` when picking `reviewBy`. */
export const HELP_REVIEW_CYCLE_MONTHS = 3;

/** Global content revision for the Help Center as a whole. */
export const HELP_CENTER_CONTENT_VERSION = "1.0.0";

export function getGuideById(id: string): HelpGuide | undefined {
  return helpGuides.find((guide) => guide.id === id);
}

export function isGuideStale(guide: HelpGuide, now: Date = new Date()): boolean {
  const reviewBy = Date.parse(`${guide.reviewBy}T23:59:59`);
  return Number.isNaN(reviewBy) || now.getTime() > reviewBy;
}

export function getStaleGuides(now: Date = new Date()): HelpGuide[] {
  return helpGuides.filter((guide) => isGuideStale(guide, now));
}

/** Guides visible to a given user, mirroring navigation role rules. */
export function guidesForRole(
  role: UserRole | undefined,
  platformAdmin?: boolean
): HelpGuide[] {
  if (platformAdmin || !role) {
    return [];
  }

  return helpGuides.filter((guide) => guide.roles.includes(role));
}

/** Flat owner/revision registry for audits and checklist reviews. */
export const helpCatalog: HelpCatalogEntry[] = helpGuides.map((guide) => ({
  guideId: guide.id,
  title: guide.title,
  route: guide.route,
  contentOwner: guide.contentOwner,
  contentVersion: guide.contentVersion,
  lastUpdated: guide.lastUpdated,
  reviewBy: guide.reviewBy,
}));

/**
 * Converts configured video metadata into a safe embed URL.
 *
 * Only https embed URLs on allow-listed hosts are returned; anything else
 * (including arbitrary or javascript: URLs) yields null so the page falls
 * back to the placeholder. Never embed raw user-provided URLs.
 */
export function resolveVideoEmbedUrl(video: HelpVideo): string | null {
  let parsed: URL;

  try {
    parsed = new URL(video.url);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:") {
    return null;
  }

  if (video.provider === "youtube") {
    const videoId = extractYouTubeId(parsed);
    return videoId
      ? `https://www.youtube-nocookie.com/embed/${videoId}`
      : null;
  }

  if (video.provider === "vimeo") {
    const match = /^\/(?:video\/)?(\d+)/.exec(parsed.pathname);
    const allowedHost =
      parsed.hostname === "vimeo.com" || parsed.hostname === "player.vimeo.com";
    return match && allowedHost
      ? `https://player.vimeo.com/video/${match[1]}`
      : null;
  }

  return null;
}

function extractYouTubeId(url: URL): string | null {
  const host = url.hostname.replace(/^www\.|^m\./, "");

  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0];
    return isSafeVideoId(id) ? id : null;
  }

  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") {
      const id = url.searchParams.get("v") ?? "";
      return isSafeVideoId(id) ? id : null;
    }

    const embedMatch = /^\/(?:embed|shorts)\/([\w-]+)/.exec(url.pathname);
    if (embedMatch && isSafeVideoId(embedMatch[1])) {
      return embedMatch[1];
    }
  }

  return null;
}

function isSafeVideoId(id: string): boolean {
  return /^[\w-]{6,20}$/.test(id);
}
