export function authErrorMessage(error: unknown, fallback: string) {
  const message = extractMessage(error).trim();

  if (!message || isObjectLikeMessage(message)) {
    return fallback;
  }

  if (message.toLowerCase().includes("email rate limit exceeded")) {
    return "Too many verification emails have been sent recently. Please wait a little while before trying again.";
  }

  return message;
}

function extractMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message : String(message ?? "");
  }

  return "";
}

function isObjectLikeMessage(message: string) {
  return message === "{}" || message === "[]" || message === "[object Object]";
}
