const configuredApiUrl = (process.env.NEXT_PUBLIC_API_URL || "")
  .trim()
  .replace(/\/+$/, "");

export const API_BASE_URL = configuredApiUrl
  ? configuredApiUrl.endsWith("/api")
    ? configuredApiUrl
    : `${configuredApiUrl}/api`
  : "http://127.0.0.1:8000/api";

export const API_URL = API_BASE_URL.slice(0, -4);
