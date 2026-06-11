import { createRemoteJWKSet, jwtVerify } from "jose";
import type { JWTPayload } from "jose";

import type { SessionUser, UserKind } from "./types";

type JwksEntry = { jwks: ReturnType<typeof createRemoteJWKSet>; createdAt: number };
const jwksCache = new Map<string, JwksEntry>();
const JWKS_TTL_MS = 60 * 60 * 1000;

function getJwks(baseUrl: string) {
  const now = Date.now();
  const hit = jwksCache.get(baseUrl);
  if (hit && now - hit.createdAt < JWKS_TTL_MS) return hit.jwks;
  const jwks = createRemoteJWKSet(new URL(`${baseUrl}/api/auth/jwks`));
  jwksCache.set(baseUrl, { jwks, createdAt: now });
  return jwks;
}

export type VerifiedJwt = JWTPayload & {
  sub: string;
  email?: string;
  kind?: UserKind | null;
  memberId?: string | null;
  membership?: string | null;
};

/**
 * Verify a SDFWA-issued JWT against the JWKS published by the auth app.
 * Throws if the token is missing, malformed, expired, or signed by an unknown key.
 */
export async function verifyJwt(
  token: string,
  options: { authBaseUrl?: string; issuer?: string } = {},
): Promise<VerifiedJwt> {
  const baseUrl =
    options.authBaseUrl ??
    process.env.AUTH_BASE_URL ??
    process.env.NEXT_PUBLIC_AUTH_BASE_URL ??
    "https://auth.sdfwa.org";
  const jwks = getJwks(baseUrl);
  const { payload } = await jwtVerify(token, jwks, {
    issuer: options.issuer ?? baseUrl,
  });
  if (typeof payload.sub !== "string") {
    throw new Error("JWT missing sub claim");
  }
  return payload as VerifiedJwt;
}

export function payloadToSessionUser(payload: VerifiedJwt): SessionUser {
  return {
    id: payload.sub,
    email: payload.email ?? "",
    kind: payload.kind ?? null,
    memberId: payload.memberId ?? null,
    membership: payload.membership ?? null,
  };
}
