/**
 * Extracts a user-facing message from an RTK Query error, falling back to a
 * generic message when the backend didn't send one. Used to surface backend
 * validation errors (e.g. password policy violations) cleanly in forms.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null && "data" in error) {
    const data = (error as { data?: { message?: string } }).data;
    if (data?.message) return data.message;
  }
  return fallback;
}
