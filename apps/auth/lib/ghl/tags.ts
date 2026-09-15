import { deriveTier } from "../auth/entitlement";
import type {
  GhlMemberInput,
  GhlTagPlan,
  ProClassRegistrationInput,
} from "./types";

const HOST_PROGRAM_TITLE = "host";
const MEMBERSHIP_TIER_TAG_PREFIX = "membership tier: ";
const MEMBERSHIP_TIER_FULL_TAG_PREFIX = "membership tier full: ";

/**
 * Per apps/auth/CONTEXT.md: bare "Shop Slot" is the main shop floor;
 * "Shop Slot - Lathe" etc. name a specific piece of equipment.
 */
export function shopSlotName(programTypeDescription: string): string {
  const suffix = programTypeDescription.slice("Shop Slot".length).trim();
  const withoutDash = suffix.replace(/^-\s*/, "");
  return withoutDash ? withoutDash.toLowerCase() : "main shop";
}

export function isShopSlot(programTypeDescription: string): boolean {
  return programTypeDescription.startsWith("Shop Slot");
}

export function isClass(programTypeDescription: string): boolean {
  return programTypeDescription === "Class";
}

export function isHostSafetyRegistration(
  registration: ProClassRegistrationInput,
): boolean {
  return (
    registration.programTypeDescription === "Safety" &&
    registration.programTitle.trim().toLowerCase() === HOST_PROGRAM_TITLE
  );
}

/** All lowercase, `key: value` with a single space, per CONTEXT.md's GHL Tag Format. */
export function membershipTierTag(tier: string): string {
  return `${MEMBERSHIP_TIER_TAG_PREFIX}${tier.toLowerCase()}`;
}

/**
 * Given a contact's current GHL tags, finds the tier value carried by any
 * existing membership-tier tag. Used by sync.ts to resolve
 * GhlMemberInput.lastKnownMembershipTier from a live read, since
 * proclass_users.membership is typically already null by the time a member
 * shows as inactive.
 */
export function findMembershipTierTag(tags: string[]): string | null {
  const match = tags.find(
    (t) =>
      t.startsWith(MEMBERSHIP_TIER_TAG_PREFIX) &&
      !t.startsWith(MEMBERSHIP_TIER_FULL_TAG_PREFIX),
  );
  return match ? match.slice(MEMBERSHIP_TIER_TAG_PREFIX.length) : null;
}

/**
 * The raw, undropped ProClass MembershipType string (e.g.
 * "shop - silver grandfathered") — kept as a separate tag alongside the
 * normalized `membership tier: <tier>` one, for staff who need the
 * status/price detail `deriveTier` deliberately discards.
 */
export function membershipTierFullTag(rawMembership: string): string {
  return `${MEMBERSHIP_TIER_FULL_TAG_PREFIX}${rawMembership.toLowerCase()}`;
}

/** Same idea as findMembershipTierTag, for the "tier full" tag. */
export function findMembershipTierFullTag(tags: string[]): string | null {
  const match = tags.find((t) => t.startsWith(MEMBERSHIP_TIER_FULL_TAG_PREFIX));
  return match ? match.slice(MEMBERSHIP_TIER_FULL_TAG_PREFIX.length) : null;
}

/**
 * Derives the activity tags (shop slot / class / safety) for one member's
 * registrations. Callers must have already filtered out junk programs
 * (see filters.ts's isJunkProgram) — this function does not re-check.
 */
export function deriveActivityTags(
  registrations: ProClassRegistrationInput[],
): string[] {
  const tags = new Set<string>();
  for (const registration of registrations) {
    const { programTypeDescription, programTitle } = registration;
    if (isClass(programTypeDescription)) {
      tags.add(`class registered: ${programTitle.toLowerCase()}`);
    } else if (isShopSlot(programTypeDescription)) {
      tags.add(`shop slot used: ${shopSlotName(programTypeDescription)}`);
    } else if (isHostSafetyRegistration(registration)) {
      tags.add("safety certification: host");
    }
  }
  return [...tags].sort();
}

/**
 * Computes the full add/remove tag set and Member Since field value for one
 * member. Pure and I/O-free — no ProClass or GHL calls.
 */
export function buildGhlTagPlan(input: GhlMemberInput): GhlTagPlan {
  const tagsToAdd = deriveActivityTags(input.registrations);
  const tagsToRemove: string[] = [];

  // Normalize the raw ProClass MembershipType (e.g. "Shop - Silver Current",
  // "Shop - Gold Grandfathered") the same way lib/auth/entitlement.ts does
  // for session claims, so GHL gets one clean "silver"/"gold"/etc. tag
  // instead of a distinct tag per raw variant. The raw string is kept too,
  // as a separate "tier full" tag, for the status/price detail that drops.
  if (input.active && input.membershipTier) {
    const tier = deriveTier(input.membershipTier);
    if (tier) tagsToAdd.push(membershipTierTag(tier));
    tagsToAdd.push(membershipTierFullTag(input.membershipTier));
  } else if (!input.active) {
    if (input.lastKnownMembershipTier) {
      tagsToRemove.push(membershipTierTag(input.lastKnownMembershipTier));
    }
    if (input.lastKnownMembershipTierFull) {
      tagsToRemove.push(
        membershipTierFullTag(input.lastKnownMembershipTierFull),
      );
    }
  }

  return {
    tagsToAdd: [...new Set(tagsToAdd)].sort(),
    tagsToRemove,
    memberSinceField: input.memberSince,
  };
}
