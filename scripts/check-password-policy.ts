/**
 * Minimal, dependency-free sanity check for the shared password policy
 * (src/lib/passwordPolicy.ts). This repo has no test runner configured yet,
 * so this script asserts the policy's behavior directly and exits non-zero
 * on failure. Run with:
 *
 *   node --experimental-strip-types scripts/check-password-policy.ts
 */
import {
  isPasswordPolicyValid,
  passwordSchema,
  PASSWORD_MIN_LENGTH,
} from "../src/lib/passwordPolicy.ts";

type Case = { value: string; expected: boolean; label: string };

const cases: Case[] = [
  { value: "", expected: false, label: "empty string" },
  { value: "short1!", expected: false, label: "below min length" },
  { value: "alllowercase1!", expected: false, label: "missing uppercase" },
  { value: "ALLUPPERCASE1!", expected: false, label: "missing lowercase" },
  { value: "NoDigitsHere!", expected: false, label: "missing number" },
  { value: "NoSpecial1234", expected: false, label: "missing special char" },
  { value: "Valid1Password!", expected: true, label: "meets every rule" },
  // Unicode code point handling: an astral-plane character (surrogate pair
  // in UTF-16, e.g. U+1F600 GRINNING FACE) must count as a single character
  // for length purposes, not two.
  {
    value: "Aa1!" + "\u{1F600}".repeat(4),
    expected: true,
    label: "astral-plane emoji counted as single code points (length 8)",
  },
  {
    value: "Aa1!" + "\u{1F600}".repeat(3),
    expected: false,
    label: "one code point short of the minimum length",
  },
  // NBSP / EM SPACE / newline must never satisfy the "special character"
  // requirement, even though they are not letters, digits, or ASCII space.
  {
    value: "Aa1Aa1Aa\u00a0",
    expected: false,
    label: "NBSP does not count as a special character",
  },
  {
    value: "Aa1Aa1Aa\u2003",
    expected: false,
    label: "EM SPACE does not count as a special character",
  },
  {
    value: "Aa1Aa1Aa\n",
    expected: false,
    label: "newline does not count as a special character",
  },
  {
    value: "Aa1Aa1Aa\u001c",
    expected: false,
    label:
      "U+001C (file separator) does not count as special - Java treats it as whitespace even though JS \\p{White_Space} excludes it",
  },
  {
    value: "Aa1Aa1Aa\u0085",
    expected: true,
    label:
      "U+0085 (NEL) counts as special - Java does NOT treat it as whitespace even though JS \\p{White_Space} includes it",
  },
  {
    value: "Aa1Aa1A!",
    expected: true,
    label: "ASCII special character still satisfies the rule",
  },
  // Unicode letters/digits should be recognized like their ASCII
  // counterparts (aligned with backend Character-based checks).
  {
    value: "Éclair1!",
    expected: true,
    label: "Unicode uppercase letter (É) recognized",
  },
];

let failures = 0;

for (const { value, expected, label } of cases) {
  const actual = isPasswordPolicyValid(value);
  if (actual !== expected) {
    failures += 1;
    console.error(
      `FAIL: ${label} -> expected isPasswordPolicyValid=${expected}, got ${actual}`
    );
  }

  const parsed = passwordSchema.safeParse(value);
  if (parsed.success !== expected) {
    failures += 1;
    console.error(
      `FAIL: ${label} -> expected passwordSchema.safeParse.success=${expected}, got ${parsed.success}`
    );
  }
}

if (PASSWORD_MIN_LENGTH !== 8) {
  failures += 1;
  console.error(
    `FAIL: PASSWORD_MIN_LENGTH expected to be 8, got ${PASSWORD_MIN_LENGTH}`
  );
}

if (failures > 0) {
  console.error(`\n${failures} password policy check(s) failed.`);
  process.exit(1);
}

console.log(`All ${cases.length} password policy checks passed.`);
