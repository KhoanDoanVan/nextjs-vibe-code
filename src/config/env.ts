const normalizeUrl = (url: string) => url.replace(/\/+$/, "");

const fallbackApiUrl = "http://localhost:8080";

export const env = {
  appName: process.env.NEXT_PUBLIC_APP_NAME?.trim() || "EduMS Frontend",
  apiBaseUrl: normalizeUrl(
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || fallbackApiUrl,
  ),
};
