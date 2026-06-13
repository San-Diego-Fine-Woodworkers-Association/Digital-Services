/** Colloquial membership tiers. Kept in sync with the auth app's `Tier`. */
export type Tier = "bronze" | "silver" | "gold" | "lifetime";

/**
 * The public session user. Identity (how someone signed in) is intentionally
 * not exposed — authorize on `claims` / `tier`, not on account origin.
 *
 * `claims` is the canonical entitlement set:
 * - `"volunteer"` — signed in via @sdfwa.org Google (staff).
 * - `"member"` + `"tier:<level>"` — holds an Active ProClass tier.
 * - `[]` — signed in, but no entitlement (a ProClass contact with no tier;
 *   the upsell state).
 *
 * `groups` carries fine-grained Workspace groups for staff (e.g.
 * `"digital-services"`) and is `[]` for everyone else.
 *
 * There is no scalar `tier` field — it lives in `claims` as `"tier:<level>"`.
 * Use `getTier(claims)` for the typed value, or `hasAnyTier` to gate.
 */
export type SessionUser = {
  id: string;
  email: string;
  memberId: string | null;
  membership: string | null;
  groups: string[];
  claims: string[];
};

export type Session = {
  user: SessionUser;
  expiresAt: string;
};

export type MemberDetail = {
  memberId: string;
  email: string;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  address: string | null;
  membership: string | null;
  memberSince: string | null;
  active: boolean;
};

export type VolunteerDetail = {
  userId: string;
  googleSub: string;
  email: string;
  name: string | null;
  groups: string[];
};

/**
 * The full current user from /api/user. Discriminate on which detail row is
 * present: `member` for ProClass contacts (whether or not they hold a tier),
 * `volunteer` for Google staff. Authorize on `claims` / `tier`.
 */
export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  memberId: string | null;
  groups: string[];
  claims: string[];
  member: MemberDetail | null;
  volunteer: VolunteerDetail | null;
};
