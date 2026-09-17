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

// Unicode letter/number category regexes, evaluated with the "u" flag so
// character classes match whole code points instead of individual UTF-16
// surrogate halves.
const UPPERCASE_RE = /\p{Lu}/u;
const LOWERCASE_RE = /\p{Ll}/u;
const DIGIT_RE = /\p{Nd}/u;
const LETTER_RE = /\p{L}/u;
const NUMBER_RE = /\p{N}/u;

// Mirrors the backend's `Character.isWhitespace(cp) || Character.isSpaceChar(cp)`
// check exactly, rather than relying on JS's built-in \p{White_Space}
// property (which disagrees with Java on a handful of code points):
//   - U+001C-U+001F (file/group/record/unit separators) count as whitespace
//     in Java (via Character.isWhitespace) but are NOT included in JS's
//     \p{White_Space}.
//   - U+0085 (NEL) is included in JS's \p{White_Space} but Java does NOT
//     treat it as whitespace (it's a control character, not a Unicode
//     space/line/paragraph separator), so it must remain eligible as a
//     "special" character.
// `Character.isSpaceChar` covers the Unicode Zs/Zl/Zp categories (\p{Z}),
// including non-breaking spaces that `Character.isWhitespace` excludes.
const JAVA_WHITESPACE_CONTROL_RE = /[\u0009-\u000D\u001C-\u001F]/u;
const UNICODE_SPACE_SEPARATOR_RE = /\p{Z}/u;

function isBackendWhitespaceCodePoint(char: string): boolean {
  return (
    JAVA_WHITESPACE_CONTROL_RE.test(char) || UNICODE_SPACE_SEPARATOR_RE.test(char)
  );
}

function isSpecialCodePoint(char: string): boolean {
  if (LETTER_RE.test(char)) return false;
  if (NUMBER_RE.test(char)) return false;
  if (isBackendWhitespaceCodePoint(char)) return false;
  return true;
}

// A "special" character is anything that isn't a letter, a number, or
// backend-equivalent whitespace - so NBSP (U+00A0), EM SPACE (U+2003),
// newlines, U+001C, etc. never count as a special character, while
// characters like U+0085 that Java does not treat as whitespace still do.
function hasSpecialCharacter(value: string): boolean {
  return [...value].some(isSpecialCodePoint);
}

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
    test: (value) => hasSpecialCharacter(value),
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
  .refine((value) => hasSpecialCharacter(value), {
    message: "Password must include a special character",
  });
