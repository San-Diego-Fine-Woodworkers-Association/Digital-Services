/**
 * Resolve the post-login redirect target.
 * `raw` is user-controlled (from `?redirect=`) so we validate it to prevent
 * open redirects: only relative paths and *.sdfwa.org / localhost URLs are
 * honored. Anything else falls back to POST_LOGIN_DEFAULT_REDIRECT (or "/").
 */
export function safeRedirect(raw: string | null | undefined): string {
  const fallback = process.env.POST_LOGIN_DEFAULT_REDIRECT ?? "/";
  if (!raw) return fallback;

  // Relative path: must start with a single "/" — "//evil.com" would be
  // protocol-relative and bypass the host check.
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return fallback;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return fallback;

  const host = url.hostname.toLowerCase();
  const allowed =
    host === "sdfwa.org" ||
    host.endsWith(".sdfwa.org") ||
    host === "localhost" ||
    host === "127.0.0.1";
  return allowed ? url.toString() : fallback;
}
