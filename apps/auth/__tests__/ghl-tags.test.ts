import { describe, expect, test } from "bun:test";

import {
  buildGhlTagPlan,
  deriveActivityTags,
  findMembershipTierFullTag,
  findMembershipTierTag,
  isHostSafetyRegistration,
  membershipTierFullTag,
  membershipTierTag,
  shopSlotName,
} from "@/lib/ghl/tags";
import type {
  GhlMemberInput,
  ProClassRegistrationInput,
} from "@/lib/ghl/types";

describe("shopSlotName", () => {
  test("bare 'Shop Slot' is the main shop", () => {
    expect(shopSlotName("Shop Slot")).toBe("main shop");
  });

  test("'Shop Slot - Lathe' names the equipment, lowercased", () => {
    expect(shopSlotName("Shop Slot - Lathe")).toBe("lathe");
  });

  test("'Shop Slot - 3D Printer' names the equipment, lowercased", () => {
    expect(shopSlotName("Shop Slot - 3D Printer")).toBe("3d printer");
  });
});

describe("isHostSafetyRegistration", () => {
  test("matches the HOST program under the Safety type", () => {
    expect(
      isHostSafetyRegistration({
        programTitle: "HOST",
        programTypeDescription: "Safety",
      }),
    ).toBe(true);
  });

  test("is case-insensitive on the program title", () => {
    expect(
      isHostSafetyRegistration({
        programTitle: "host",
        programTypeDescription: "Safety",
      }),
    ).toBe(true);
  });

  test("does not match other Safety programs (e.g. New Member orientation)", () => {
    expect(
      isHostSafetyRegistration({
        programTitle: "New Member orientation",
        programTypeDescription: "Safety",
      }),
    ).toBe(false);
  });

  test("does not match a program titled HOST outside the Safety type", () => {
    expect(
      isHostSafetyRegistration({
        programTitle: "HOST",
        programTypeDescription: "Class",
      }),
    ).toBe(false);
  });
});

describe("membershipTierTag", () => {
  test("lowercases the tier into key: value format", () => {
    expect(membershipTierTag("Shop - Gold Current")).toBe(
      "membership tier: shop - gold current",
    );
  });
});

describe("findMembershipTierTag", () => {
  test("finds the tier value from an existing membership tier tag", () => {
    expect(
      findMembershipTierTag(["class registered: foo", "membership tier: gold"]),
    ).toBe("gold");
  });

  test("returns null when no membership tier tag is present", () => {
    expect(findMembershipTierTag(["class registered: foo"])).toBeNull();
  });

  test("returns null for an empty tag list", () => {
    expect(findMembershipTierTag([])).toBeNull();
  });

  test("does not match the 'tier full' tag", () => {
    expect(
      findMembershipTierTag(["membership tier full: shop - gold current"]),
    ).toBeNull();
  });
});

describe("membershipTierFullTag", () => {
  test("lowercases the raw membership string into key: value format", () => {
    expect(membershipTierFullTag("Shop - Gold Current")).toBe(
      "membership tier full: shop - gold current",
    );
  });
});

describe("findMembershipTierFullTag", () => {
  test("finds the raw value from an existing tier full tag", () => {
    expect(
      findMembershipTierFullTag([
        "membership tier: gold",
        "membership tier full: shop - gold current",
      ]),
    ).toBe("shop - gold current");
  });

  test("returns null when no tier full tag is present", () => {
    expect(findMembershipTierFullTag(["membership tier: gold"])).toBeNull();
  });
});

describe("deriveActivityTags", () => {
  test("tags a Class registration with the full program title", () => {
    const registrations: ProClassRegistrationInput[] = [
      { programTitle: "Introduction to Woodworking A", programTypeDescription: "Class" },
    ];
    expect(deriveActivityTags(registrations)).toEqual([
      "class registered: introduction to woodworking a",
    ]);
  });

  test("tags a Shop Slot registration by equipment name", () => {
    const registrations: ProClassRegistrationInput[] = [
      { programTitle: "Lathe Slot", programTypeDescription: "Shop Slot - Lathe" },
    ];
    expect(deriveActivityTags(registrations)).toEqual(["shop slot used: lathe"]);
  });

  test("tags a bare Shop Slot registration as the main shop", () => {
    const registrations: ProClassRegistrationInput[] = [
      { programTitle: "Open Shop", programTypeDescription: "Shop Slot" },
    ];
    expect(deriveActivityTags(registrations)).toEqual([
      "shop slot used: main shop",
    ]);
  });

  test("tags a HOST safety registration", () => {
    const registrations: ProClassRegistrationInput[] = [
      { programTitle: "HOST", programTypeDescription: "Safety" },
    ];
    expect(deriveActivityTags(registrations)).toEqual([
      "safety certification: host",
    ]);
  });

  test("ignores non-Class/Shop-Slot/HOST programs (e.g. SIG, general orientation)", () => {
    const registrations: ProClassRegistrationInput[] = [
      { programTitle: "Turners SIG", programTypeDescription: "SIG" },
      { programTitle: "New Member orientation", programTypeDescription: "Safety" },
    ];
    expect(deriveActivityTags(registrations)).toEqual([]);
  });

  test("deduplicates repeated registrations and sorts the result", () => {
    const registrations: ProClassRegistrationInput[] = [
      { programTitle: "Lathe Slot", programTypeDescription: "Shop Slot - Lathe" },
      { programTitle: "Lathe Slot", programTypeDescription: "Shop Slot - Lathe" },
      { programTitle: "Beginner Woodworking", programTypeDescription: "Class" },
    ];
    expect(deriveActivityTags(registrations)).toEqual([
      "class registered: beginner woodworking",
      "shop slot used: lathe",
    ]);
  });

  test("returns an empty array for no registrations", () => {
    expect(deriveActivityTags([])).toEqual([]);
  });
});

describe("buildGhlTagPlan", () => {
  const base: GhlMemberInput = {
    registrations: [],
    membershipTier: null,
    lastKnownMembershipTier: null,
    lastKnownMembershipTierFull: null,
    memberSince: "2020-01-01",
  };

  test("member with a current tier gets both tier tags added alongside activity tags", () => {
    const plan = buildGhlTagPlan({
      ...base,
      registrations: [
        { programTitle: "Beginner Woodworking", programTypeDescription: "Class" },
      ],
      membershipTier: "Shop - Gold Current",
    });
    expect(plan.tagsToAdd).toEqual([
      "class registered: beginner woodworking",
      "membership tier full: shop - gold current",
      "membership tier: gold",
    ]);
    expect(plan.tagsToRemove).toEqual([]);
    expect(plan.memberSinceField).toBe("2020-01-01");
  });

  test("normalizes the raw ProClass tier string the same way session claims do (drops status/price noise)", () => {
    const plan = buildGhlTagPlan({
      ...base,
      membershipTier: "Shop - Silver Grandfathered",
    });
    expect(plan.tagsToAdd).toEqual([
      "membership tier full: shop - silver grandfathered",
      "membership tier: silver",
    ]);
  });

  test("member with no current tier and no last-known tier gets no tier tags", () => {
    const plan = buildGhlTagPlan({ ...base, membershipTier: null });
    expect(plan.tagsToAdd).toEqual([]);
  });

  test("member with an unmapped tier string gets the full tag but no normalized tag (drift, not a fabricated one)", () => {
    const plan = buildGhlTagPlan({
      ...base,
      membershipTier: "Some New Tier Nobody Has Mapped Yet",
    });
    expect(plan.tagsToAdd).toEqual([
      "membership tier full: some new tier nobody has mapped yet",
    ]);
  });

  test("no current membershipTier with last-known tiers gets both tags removed, not added", () => {
    const plan = buildGhlTagPlan({
      ...base,
      membershipTier: null,
      lastKnownMembershipTier: "bronze",
      lastKnownMembershipTierFull: "shop - bronze current",
    });
    expect(plan.tagsToAdd).toEqual([]);
    expect(plan.tagsToRemove).toEqual([
      "membership tier: bronze",
      "membership tier full: shop - bronze current",
    ]);
  });

  test("no current membershipTier and no last-known tiers removes nothing", () => {
    const plan = buildGhlTagPlan({
      ...base,
      membershipTier: null,
      lastKnownMembershipTier: null,
      lastKnownMembershipTierFull: null,
    });
    expect(plan.tagsToRemove).toEqual([]);
  });

  test("a member whose ProClass membership lapsed (membershipTier null) still gets their stale tier tags removed, since removal never depends on ProClass's contact-presence flag", () => {
    const plan = buildGhlTagPlan({
      ...base,
      registrations: [
        { programTitle: "Beginner Woodworking", programTypeDescription: "Class" },
      ],
      membershipTier: null,
      lastKnownMembershipTier: "gold",
      lastKnownMembershipTierFull: "shop - gold current",
    });
    expect(plan.tagsToAdd).toEqual(["class registered: beginner woodworking"]);
    expect(plan.tagsToRemove).toEqual([
      "membership tier: gold",
      "membership tier full: shop - gold current",
    ]);
  });

  test("memberSinceField passes memberSince through as-is, including null", () => {
    expect(buildGhlTagPlan({ ...base, memberSince: null }).memberSinceField).toBeNull();
  });
});
