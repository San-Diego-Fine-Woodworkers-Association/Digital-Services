import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { safeRedirect } from "@/lib/safe-redirect";

/**
 * Centralized sign-out, mirroring the centralized `/login` page.
 *
 * Consumer apps (WordPress, diw, shop-ops) link to
 * `https://auth.sdfwa.org/logout?redirect=<dest>` with a plain GET — no
 * cross-origin fetch, no CORS, no client JS. We sign out server-side via the
 * auth instance (so the session cookie is cleared with the correct
 * cross-subdomain attributes) and 302 to the validated redirect.
 *
 * `redirect` is user-controlled, so `safeRedirect` restricts it to relative
 * paths and *.sdfwa.org / localhost — same open-redirect guard as `/login`.
 *
 * This is a GET on purpose, to support plain links. Sign-out is low-risk
 * (worst case: a user is logged out), so the relaxed CSRF posture is
 * acceptable here even though Better-Auth's own POST endpoint is stricter.
 */
export async function GET(req: NextRequest) {
  const redirectTo = safeRedirect(req.nextUrl.searchParams.get("redirect"));
  const dest = new URL(redirectTo, req.nextUrl.origin);

  const res = NextResponse.redirect(dest);

  try {
    const signOutRes = await auth.api.signOut({
      headers: req.headers,
      asResponse: true,
    });
    // Forward the session-clearing Set-Cookie headers onto the redirect.
    for (const cookie of signOutRes.headers.getSetCookie()) {
      res.headers.append("set-cookie", cookie);
    }
  } catch {
    // No active session (or already signed out) — just proceed to redirect.
  }

  return res;
}
