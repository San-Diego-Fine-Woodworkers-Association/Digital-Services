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

export async function requireMember(cookieHeader: string): Promise<Session> {
  const s = await getServerSession(cookieHeader);
  if (!s) throw new Error("Unauthorized");
  if (s.user.kind !== "member") throw new Error("Forbidden");
  return s;
}

export async function requireVolunteer(cookieHeader: string): Promise<Session> {
  const s = await getServerSession(cookieHeader);
  if (!s) throw new Error("Unauthorized");
  if (s.user.kind !== "volunteer") throw new Error("Forbidden");
  return s;
}
