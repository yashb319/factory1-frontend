import { z } from "zod";

/**
 * Single source of truth for the account password policy. Reused by every
 * form that lets a user set or reset a password (signup, reset-password
 * confirmation, employee activation, etc.) so the requirements text, regex,
 * and Zod validation never drift apart. The backend remains authoritative;
 * this only keeps the client locally consistent with that policy.
 *
 * All checks operate on Unicode code points (not UTF-16 code units) and use
 * Unicode property escapes so multi-byte characters (e.g. astral-plane
 * characters, combining marks) are counted/classified correctly and align
 * with the backend's Character-based (code point) checks as closely as JS
 * allows.
 */
export const PASSWORD_MIN_LENGTH = 8;

// Unicode letter/number/whitespace category regexes, evaluated with the "u"
// flag so character classes match whole code points instead of individual
// UTF-16 surrogate halves.
const UPPERCASE_RE = /\p{Lu}/u;
const LOWERCASE_RE = /\p{Ll}/u;
const DIGIT_RE = /\p{Nd}/u;
// A "special" character is anything that isn't a letter, a number, or
// Unicode whitespace - so NBSP (U+00A0), EM SPACE (U+2003), newlines, etc.
// never count as a special character.
const SPECIAL_RE = /[^\p{L}\p{N}\p{White_Space}]/u;

function codePointLength(value: string): number {
  // Spreading a string iterates by Unicode code point, so surrogate pairs
  // (e.g. astral-plane characters) count as a single character, matching
  // how a human - and the backend - would count password length.
  return [...value].length;
}

export type PasswordRequirement = {
  id: string;
  label: string;
  test: (value: string) => boolean;
};

export const passwordRequirements: readonly PasswordRequirement[] = [
  {
    id: "length",
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    test: (value) => codePointLength(value) >= PASSWORD_MIN_LENGTH,
  },
  {
    id: "uppercase",
    label: "One uppercase letter (A-Z)",
    test: (value) => UPPERCASE_RE.test(value),
  },
  {
    id: "lowercase",
    label: "One lowercase letter (a-z)",
    test: (value) => LOWERCASE_RE.test(value),
  },
  {
    id: "number",
    label: "One number (0-9)",
    test: (value) => DIGIT_RE.test(value),
  },
  {
    id: "special",
    label: "One special character (e.g. !@#$%)",
    test: (value) => SPECIAL_RE.test(value),
  },
];

export function getUnmetPasswordRequirements(
  value: string
): PasswordRequirement[] {
  return passwordRequirements.filter((requirement) => !requirement.test(value));
}

export function isPasswordPolicyValid(value: string): boolean {
  return passwordRequirements.every((requirement) => requirement.test(value));
}

export const passwordPolicyDescription =
  "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character.";

/** Zod schema for any field that sets/resets a password (not for login). */
export const passwordSchema = z
  .string()
  .refine((value) => codePointLength(value) >= PASSWORD_MIN_LENGTH, {
    message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
  })
  .refine((value) => UPPERCASE_RE.test(value), {
    message: "Password must include an uppercase letter",
  })
  .refine((value) => LOWERCASE_RE.test(value), {
    message: "Password must include a lowercase letter",
  })
  .refine((value) => DIGIT_RE.test(value), {
    message: "Password must include a number",
  })
  .refine((value) => SPECIAL_RE.test(value), {
    message: "Password must include a special character",
  });
