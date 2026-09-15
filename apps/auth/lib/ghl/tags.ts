import type {
  GhlMemberInput,
  GhlTagPlan,
  ProClassRegistrationInput,
} from "./types";

const HOST_PROGRAM_TITLE = "host";

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
  return `membership tier: ${tier.toLowerCase()}`;
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

  if (input.active && input.membershipTier) {
    tagsToAdd.push(membershipTierTag(input.membershipTier));
  } else if (!input.active && input.lastKnownMembershipTier) {
    tagsToRemove.push(membershipTierTag(input.lastKnownMembershipTier));
  }

  return {
    tagsToAdd: [...new Set(tagsToAdd)].sort(),
    tagsToRemove,
    memberSinceField: input.memberSince,
  };
}
