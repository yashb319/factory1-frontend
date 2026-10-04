/**
 * Extracts a user-facing message from an RTK Query error, falling back to a
 * generic message when the backend didn't send one. Used to surface backend
 * validation errors (e.g. password policy violations) cleanly in forms.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null && "data" in error) {
    const data = (error as {
      data?: { message?: string; error?: string; detail?: string };
    }).data;
    if (data?.message) return data.message;
    if (data?.error) return data.error;
    if (data?.detail) return data.detail;
  }

  if (typeof error === "object" && error !== null) {
    if ("error" in error && typeof error.error === "string") {
      return error.error;
    }
    if ("message" in error && typeof error.message === "string") {
      return error.message;
    }
  }

  return fallback;
}

export function isCodeConflict(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return false;
  }

  return (
    (error as { status?: number }).status === 409 &&
    getErrorMessage(error, "") === "The submitted code conflicts with an existing record"
  );
}
