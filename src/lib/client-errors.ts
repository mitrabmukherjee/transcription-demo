/** Safe error text for API JSON responses (details stay in server logs). */
export function publicApiErrorMessage(
  err: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  if (err instanceof Error && err.message) {
    const msg = err.message;
    if (msg.includes("API_KEY") || msg.includes("BLOB_") || msg.includes("not configured")) {
      return msg;
    }
  }
  return fallback;
}
