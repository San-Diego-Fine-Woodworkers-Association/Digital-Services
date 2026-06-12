/**
 * Build CORS headers for cross-app calls from *.sdfwa.org consumers.
 * In dev we also allow http://localhost:*.
 */
export function corsHeaders(origin: string | null): Headers {
  const h = new Headers();
  if (!origin) return h;
  let allow = false;
  try {
    const url = new URL(origin);
    const host = url.hostname.toLowerCase();
    if (host === "sdfwa.org" || host.endsWith(".sdfwa.org")) allow = true;
    if (host === "localhost" || host === "127.0.0.1") allow = true;
  } catch {
    // not a URL
  }
  if (!allow) return h;
  h.set("Access-Control-Allow-Origin", origin);
  h.set("Access-Control-Allow-Credentials", "true");
  h.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  h.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  h.set("Vary", "Origin");
  return h;
}

export function preflight(req: Request): Response | null {
  if (req.method !== "OPTIONS") return null;
  return new Response(null, {
    status: 204,
    headers: corsHeaders(req.headers.get("origin")),
  });
}

export function withCors(res: Response, req: Request): Response {
  const h = corsHeaders(req.headers.get("origin"));
  h.forEach((v, k) => res.headers.set(k, v));
  return res;
}
