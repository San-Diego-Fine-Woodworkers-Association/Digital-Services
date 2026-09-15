/**
 * Inputs to the GHL sync's pure logic (tags.ts, filters.ts). Deliberately
 * decoupled from apps/auth/lib/proclass/types.ts's raw API shapes — mapping
 * ProClass's Contact/Program/Registration records into these lives in
 * sync.ts, so this module has no ProClass (or GHL) I/O dependency.
 */

export type JunkCheckContact = {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  createDate: string | null;
};

export type JunkCheckProgram = {
  title: string;
  status: string;
};

/** A single ProClass registration, already filtered of junk programs. */
export type ProClassRegistrationInput = {
  programTitle: string;
  /** ProClass's ProgramType.Description, e.g. "Class", "Shop Slot", "Shop Slot - Lathe", "Safety". */
  programTypeDescription: string;
};

export type GhlMemberInput = {
  /** This member's registrations, already filtered of junk programs. */
  registrations: ProClassRegistrationInput[];
  /** proclass_users.membership for this member (null if no current active membership). */
  membershipTier: string | null;
  /** proclass_users.active for this member. */
  active: boolean;
  /**
   * The tier tag to remove now that this member has lapsed, if any. Only
   * meaningful when `active` is false. Resolving *which* tag this is is a
   * sync.ts (I/O-layer) concern — see the note on `buildGhlTagPlan` — since
   * `membershipTier` is typically already null by the time a member shows
   * as inactive (the hourly ETL clears it once no Active membership remains).
   */
  lastKnownMembershipTier: string | null;
  /** proclass_users.memberSince (ISO YYYY-MM-DD), or null. */
  memberSince: string | null;
};

export type GhlTagPlan = {
  tagsToAdd: string[];
  tagsToRemove: string[];
  /** ISO YYYY-MM-DD value for the GHL "Member Since" Date custom field, or null to leave unset. */
  memberSinceField: string | null;
};
