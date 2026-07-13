import type { AuthUser } from "@/features/auth/types";

export type FactoryUiMode = "modern" | "tally";

export const UI_MODE_CHANGED_EVENT = "factory1:ui-mode-changed";

const UI_MODE_KEY = "factory1_ui_mode";
const UI_MODE_PROMPT_KEY = "factory1_ui_mode_prompt_seen_at";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function scopedKey(baseKey: string, user?: Pick<AuthUser, "email" | "organizationId"> | null) {
  if (!user?.organizationId && !user?.email) {
    return baseKey;
  }

  return `${baseKey}:${user.organizationId || "org"}:${user.email || "user"}`;
}

export function getFactoryUiMode(
  user?: Pick<AuthUser, "email" | "organizationId"> | null
): FactoryUiMode {
  if (typeof window === "undefined") {
    return "modern";
  }

  const saved = window.localStorage.getItem(scopedKey(UI_MODE_KEY, user));
  return saved === "tally" ? "tally" : "modern";
}

export function setFactoryUiMode(
  mode: FactoryUiMode,
  user?: Pick<AuthUser, "email" | "organizationId"> | null
) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(scopedKey(UI_MODE_KEY, user), mode);
  markFactoryUiModePromptSeen(user);
  window.dispatchEvent(
    new CustomEvent(UI_MODE_CHANGED_EVENT, {
      detail: { mode },
    })
  );
}

export function markFactoryUiModePromptSeen(
  user?: Pick<AuthUser, "email" | "organizationId"> | null
) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    scopedKey(UI_MODE_PROMPT_KEY, user),
    String(Date.now())
  );
}

export function shouldShowFactoryUiModePrompt(
  user?: Pick<AuthUser, "email" | "organizationId"> | null
) {
  if (typeof window === "undefined") {
    return false;
  }

  const seenAt = Number(
    window.localStorage.getItem(scopedKey(UI_MODE_PROMPT_KEY, user)) || 0
  );

  return !seenAt || Date.now() - seenAt >= WEEK_MS;
}

export function getNextFactoryUiModePromptDate(
  user?: Pick<AuthUser, "email" | "organizationId"> | null
) {
  if (typeof window === "undefined") {
    return null;
  }

  const seenAt = Number(
    window.localStorage.getItem(scopedKey(UI_MODE_PROMPT_KEY, user)) || 0
  );

  if (!seenAt) {
    return null;
  }

  return new Date(seenAt + WEEK_MS);
}
