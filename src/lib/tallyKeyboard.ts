import type React from "react";

const focusableSelector = [
  "input:not([type='hidden']):not([disabled])",
  "textarea:not([disabled])",
  "select:not([disabled])",
  "[role='combobox']:not([aria-disabled='true'])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const fieldSelector = [
  "input:not([type='hidden'])",
  "textarea",
  "select",
  "[role='combobox']",
].join(",");

export function handleTallyFieldNavigation(
  event: React.KeyboardEvent<HTMLElement>
) {
  if (event.altKey || event.ctrlKey || event.metaKey) {
    return;
  }

  if (event.key !== "Enter" && event.key !== "Escape") {
    return;
  }

  const target = event.target as HTMLElement | null;
  if (!target || target.closest("[data-ignore-tally-nav='true']")) {
    return;
  }

  const field = target.closest<HTMLElement>(fieldSelector);
  if (!field) {
    return;
  }

  if (
    event.key === "Enter" &&
    field.tagName === "TEXTAREA" &&
    event.shiftKey
  ) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const scope =
    field.closest<HTMLElement>("[data-tally-nav-scope]") ??
    event.currentTarget;
  const focusables = Array.from(
    scope.querySelectorAll<HTMLElement>(focusableSelector)
  ).filter(isVisibleFocusable);
  const current =
    field.matches(focusableSelector)
      ? field
      : field.closest<HTMLElement>(focusableSelector);
  const currentIndex = current ? focusables.indexOf(current) : -1;
  const nextIndex =
    event.key === "Enter" ? currentIndex + 1 : currentIndex - 1;
  const next = focusables[nextIndex];

  if (!next) {
    current?.blur();
    return;
  }

  next.focus();
  selectIfTextLike(next);
}

function isVisibleFocusable(element: HTMLElement) {
  if (element.closest("[hidden], [aria-hidden='true']")) {
    return false;
  }

  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLButtonElement
  ) {
    return !element.disabled;
  }

  return element.getClientRects().length > 0;
}

function selectIfTextLike(element: HTMLElement) {
  if (!(element instanceof HTMLInputElement)) {
    return;
  }

  if (
    ["email", "number", "search", "tel", "text", "time", "url"].includes(
      element.type
    )
  ) {
    window.requestAnimationFrame(() => element.select());
  }
}
