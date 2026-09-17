import { z } from "zod";

/**
 * Single source of truth for the account password policy. Reused by every
 * form that lets a user set or reset a password (signup, reset-password
 * confirmation, employee activation, etc.) so the requirements text, regex,
 * and Zod validation never drift apart. The backend remains authoritative;
 * this only keeps the client locally consistent with that policy.
 */
export const PASSWORD_MIN_LENGTH = 8;

export type PasswordRequirement = {
  id: string;
  label: string;
  test: (value: string) => boolean;
};

export const passwordRequirements: readonly PasswordRequirement[] = [
  {
    id: "length",
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    test: (value) => value.length >= PASSWORD_MIN_LENGTH,
  },
  {
    id: "uppercase",
    label: "One uppercase letter (A-Z)",
    test: (value) => /[A-Z]/.test(value),
  },
  {
    id: "lowercase",
    label: "One lowercase letter (a-z)",
    test: (value) => /[a-z]/.test(value),
  },
  {
    id: "number",
    label: "One number (0-9)",
    test: (value) => /[0-9]/.test(value),
  },
  {
    id: "special",
    label: "One special character (e.g. !@#$%)",
    test: (value) => /[^A-Za-z0-9]/.test(value),
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
  .min(
    PASSWORD_MIN_LENGTH,
    `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
  )
  .refine((value) => /[A-Z]/.test(value), {
    message: "Password must include an uppercase letter",
  })
  .refine((value) => /[a-z]/.test(value), {
    message: "Password must include a lowercase letter",
  })
  .refine((value) => /[0-9]/.test(value), {
    message: "Password must include a number",
  })
  .refine((value) => /[^A-Za-z0-9]/.test(value), {
    message: "Password must include a special character",
  });
