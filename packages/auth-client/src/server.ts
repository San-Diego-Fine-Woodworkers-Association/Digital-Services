import type { CurrentUser, Session, SessionUser } from "./types";

function authBaseUrl(): string {
  return (
    process.env.AUTH_BASE_URL ??
    process.env.NEXT_PUBLIC_AUTH_BASE_URL ??
    "https://auth.sdfwa.org"
  );
}

/**
 * Fetch the cheap session summary from the auth app. Requires the request's
 * cookies be forwarded — pass them in from a server component using `cookies()`.
 */
export async function getServerSession(
  cookieHeader: string,
): Promise<Session | null> {
  const res = await fetch(`${authBaseUrl()}/api/session`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { user: SessionUser | null; expiresAt?: string };
  if (!data.user) return null;
  return { user: data.user, expiresAt: data.expiresAt ?? "" };
}

export async function getCurrentUser(cookieHeader: string): Promise<CurrentUser | null> {
  const res = await fetch(`${authBaseUrl()}/api/user`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as CurrentUser;
}

/**
 * Require a valid session — any signed-in user, regardless of entitlement.
 * Throws "Unauthorized" when signed out. Use this for the upsell-funnel case
 * (a known person who may hold no claims yet).
 */
export async function requireAuthenticated(
  cookieHeader: string,
): Promise<Session> {
  const s = await getServerSession(cookieHeader);
  if (!s) throw new Error("Unauthorized");
  return s;
}

/**
 * Require the session to carry at least one of the listed claims (e.g.
 * `"member"`, `"volunteer"`, `"tier:gold"`). Throws "Unauthorized" when signed
 * out and "Forbidden" when signed in without a matching claim. An empty
 * `claim` list is default-closed (always Forbidden) — use
 * `requireAuthenticated` for "signed in at all."
 */
export async function requireClaim(
  cookieHeader: string,
  claim: string | string[],
): Promise<Session> {
  const s = await getServerSession(cookieHeader);
  if (!s) throw new Error("Unauthorized");
  const allowed = Array.isArray(claim) ? claim : [claim];
  const userClaims = s.user.claims ?? [];
  if (allowed.length === 0 || !allowed.some((c) => userClaims.includes(c))) {
    throw new Error("Forbidden");
  }
  return s;
}

/**
 * Require the session to include at least one of the listed groups. Pass a
 * single group string or an array. Throws "Unauthorized" if there's no session
 * and "Forbidden" if there is one but none of the groups match.
 */
export async function requireGroup(
  cookieHeader: string,
  group: string | string[],
): Promise<Session> {
  const s = await getServerSession(cookieHeader);
  if (!s) throw new Error("Unauthorized");
  const allowed = Array.isArray(group) ? group : [group];
  const userGroups = s.user.groups ?? [];
  if (!allowed.some((g) => userGroups.includes(g))) {
    throw new Error("Forbidden");
  }
  return s;
}
