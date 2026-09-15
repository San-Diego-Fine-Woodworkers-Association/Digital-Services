import { deriveTier } from "../auth/entitlement";
import type {
  GhlMemberInput,
  GhlTagPlan,
  ProClassRegistrationInput,
} from "./types";

const HOST_PROGRAM_TITLE = "host";
const MEMBERSHIP_TIER_TAG_PREFIX = "membership tier: ";
const MEMBERSHIP_TIER_FULL_TAG_PREFIX = "membership tier full: ";

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

export function membershipTierTag(tier: string): string {
  return `${MEMBERSHIP_TIER_TAG_PREFIX}${tier.toLowerCase()}`;
}

export function findMembershipTierTag(tags: string[]): string | null {
  const match = tags.find(
    (t) =>
      t.startsWith(MEMBERSHIP_TIER_TAG_PREFIX) &&
      !t.startsWith(MEMBERSHIP_TIER_FULL_TAG_PREFIX),
  );
  return match ? match.slice(MEMBERSHIP_TIER_TAG_PREFIX.length) : null;
}

export function membershipTierFullTag(rawMembership: string): string {
  return `${MEMBERSHIP_TIER_FULL_TAG_PREFIX}${rawMembership.toLowerCase()}`;
}

export function findMembershipTierFullTag(tags: string[]): string | null {
  const match = tags.find((t) => t.startsWith(MEMBERSHIP_TIER_FULL_TAG_PREFIX));
  return match ? match.slice(MEMBERSHIP_TIER_FULL_TAG_PREFIX.length) : null;
}

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

export function buildGhlTagPlan(input: GhlMemberInput): GhlTagPlan {
  const tagsToAdd = deriveActivityTags(input.registrations);
  const tagsToRemove: string[] = [];

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
