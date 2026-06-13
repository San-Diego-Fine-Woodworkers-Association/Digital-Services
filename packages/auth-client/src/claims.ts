/**
 * Pure claim predicates — the uniform way to gate on entitlement across apps.
 * Safe in Next.js middleware (no fetch, no Node-only APIs).
 *
 * Claims are case-sensitive, lowercase strings: `"member"`, `"volunteer"`,
 * `"tier:gold"`, etc. Compare against lowercase constants.
 *
 * Default-closed: an empty `userClaims`, or an empty `allowed`/`required` list,
 * yields false.
 *
 * Note `claims: []` is a meaningful state (signed in, no entitlement). To gate
 * on "is signed in at all" check session presence, not a claim.
 */

import type { Tier } from "./types";

export function hasClaim(userClaims: string[], claim: string): boolean {
  return userClaims.includes(claim);
}

export function hasAnyClaim(userClaims: string[], allowed: string[]): boolean {
  if (allowed.length === 0) return false;
  return allowed.some((c) => userClaims.includes(c));
}

export function hasAllClaims(userClaims: string[], required: string[]): boolean {
  if (required.length === 0) return false;
  return required.every((c) => userClaims.includes(c));
}

/** Convenience: does the user hold an Active membership tier (any level)? */
export function isMember(userClaims: string[]): boolean {
  return userClaims.includes("member");
}

/** Convenience: does the user hold one of the given tiers? */
export function hasAnyTier(userClaims: string[], tiers: Tier[]): boolean {
  return hasAnyClaim(
    userClaims,
    tiers.map((t) => `tier:${t}`),
  );
}

/**
 * The user's membership tier as a typed value, or null. Extracts it from the
 * `tier:<level>` claim — there is at most one. For display / "which level"; to
 * gate, prefer `hasAnyTier`.
 */
export function getTier(userClaims: string[]): Tier | null {
  const claim = userClaims.find((c) => c.startsWith("tier:"));
  return claim ? (claim.slice("tier:".length) as Tier) : null;
}
