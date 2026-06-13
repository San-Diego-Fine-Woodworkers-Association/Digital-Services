/**
 * Entitlement derivation — the single place that turns raw ProClass identity
 * facts into the normalized `tier` + `claims` we expose to consumer apps.
 *
 * Consumers must never re-derive entitlement from the raw `membership` string;
 * they read `tier` / `claims` off the session, JWT, or /api/session response.
 *
 * Identity vs. entitlement:
 * - The internal `user.accountOrigin` ("proclass" | "google") records how
 *   someone authenticated. It is NOT exposed publicly and does NOT mean "paying."
 * - The `member` claim is present only for users with an Active ProClass tier.
 *   A logged-in ProClass contact with no tier carries an empty claims array —
 *   that's the upsell state (known person, no entitlement).
 *
 * All functions are synchronous and side-effect free so they're safe inside
 * Better-Auth's session-build hooks (customSession, jwt.definePayload), which
 * must not await.
 */

/** Colloquial membership tiers. Kept in sync with auth-client's `Tier`. */
export type Tier = "bronze" | "silver" | "gold" | "lifetime";

/**
 * Map a raw ProClass `MembershipType` string to a normalized tier. The raw
 * values bundle level + status + price (e.g. "Shop - Silver Grandfather",
 * "Shop - Gold $395"); we match on the level word only. Checked most- to
 * least-specific so a hypothetical "Gold Lifetime" resolves to lifetime.
 * Returns null when there's no membership or the value matches no known tier
 * (surfaced via the /api/memberships/tiers `unmapped` bucket so taxonomy drift
 * is visible).
 */
export function deriveTier(membership: string | null | undefined): Tier | null {
  if (!membership) return null;
  const m = membership.toLowerCase();
  if (m.includes("lifetime")) return "lifetime";
  if (m.includes("gold")) return "gold";
  if (m.includes("silver")) return "silver";
  if (m.includes("bronze")) return "bronze";
  return null;
}

export type Entitlement = { tier: Tier | null; claims: string[] };

/**
 * Compute the public `tier` + `claims` for a user.
 *
 * - `volunteer` — present iff they authenticated via Google (`accountOrigin`).
 * - `member` + `tier:<level>` — present iff they hold an Active ProClass tier.
 *
 * `accountOrigin` is read here (identity) but never emitted; only its derived
 * claims are.
 */
export function deriveEntitlement(
  accountOrigin: string | null | undefined,
  membership: string | null | undefined,
): Entitlement {
  const tier = deriveTier(membership);
  const claims: string[] = [];
  if (accountOrigin === "google") claims.push("volunteer");
  if (tier) claims.push("member", `tier:${tier}`);
  return { tier, claims };
}
