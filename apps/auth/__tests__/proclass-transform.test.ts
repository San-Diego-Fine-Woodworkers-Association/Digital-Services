import { describe, expect, test } from "bun:test";

import {
  getActiveMembership,
  getOldestMembership,
  getPrimaryAccountId,
  joinContactsAndMemberships,
  pickPhone,
  pickPrimaryAddress,
  projectMember,
} from "@/lib/proclass/transform";
import type {
  ProClassContact,
  ProClassMembership,
} from "@/lib/proclass/types";

const baseContact: ProClassContact = {
  ContactId: 12345,
  Email: "a@example.com",
  Mobile: null,
  HomePhone: null,
  WorkPhone: null,
  FirstName: "Ada",
  LastName: "Lovelace",
  Addresses: null,
  ContactAccounts: [{ AccountId: 99, IsPrimary: true }],
};

describe("pickPhone", () => {
  test("prefers Mobile over Home over Work", () => {
    expect(
      pickPhone({
        ...baseContact,
        Mobile: "555-mob",
        HomePhone: "555-home",
        WorkPhone: "555-work",
      }),
    ).toBe("555-mob");
  });

  test("falls back to HomePhone when Mobile missing", () => {
    expect(
      pickPhone({ ...baseContact, HomePhone: "555-home", WorkPhone: "555-work" }),
    ).toBe("555-home");
  });

  test("falls back to WorkPhone last", () => {
    expect(pickPhone({ ...baseContact, WorkPhone: "555-work" })).toBe("555-work");
  });

  test("returns null when no phone present", () => {
    expect(pickPhone(baseContact)).toBeNull();
  });
});

describe("pickPrimaryAddress", () => {
  test("returns the IsPrimary address concatenated with state and zip", () => {
    expect(
      pickPrimaryAddress([
        {
          IsPrimary: false,
          StreetAddress1: "123 Other St",
          StreetAddress2: null,
          City: "Nowhere",
          State: { Abbreviation: "NV" },
          PostalCode: "00000",
        },
        {
          IsPrimary: true,
          StreetAddress1: "1 Infinite Loop",
          StreetAddress2: "Suite 2",
          City: "Cupertino",
          State: { Abbreviation: "CA" },
          PostalCode: "95014",
        },
      ]),
    ).toBe("1 Infinite Loop, Suite 2, Cupertino, CA, 95014");
  });

  test("falls back to first address when no IsPrimary set", () => {
    expect(
      pickPrimaryAddress([
        {
          IsPrimary: false,
          StreetAddress1: "First St",
          StreetAddress2: null,
          City: "A",
          State: null,
          PostalCode: null,
        },
      ]),
    ).toBe("First St, A");
  });

  test("returns null when addresses list is empty or null", () => {
    expect(pickPrimaryAddress([])).toBeNull();
    expect(pickPrimaryAddress(null)).toBeNull();
    expect(pickPrimaryAddress(undefined)).toBeNull();
  });

  test("skips blank components without leaving stray commas", () => {
    expect(
      pickPrimaryAddress([
        {
          IsPrimary: true,
          StreetAddress1: "742 Evergreen Terrace",
          StreetAddress2: "",
          City: "Springfield",
          State: { Abbreviation: null },
          PostalCode: null,
        },
      ]),
    ).toBe("742 Evergreen Terrace, Springfield");
  });
});

describe("getPrimaryAccountId", () => {
  test("prefers the ContactAccount marked IsPrimary", () => {
    expect(
      getPrimaryAccountId({
        ...baseContact,
        ContactAccounts: [
          { AccountId: 7, IsPrimary: false },
          { AccountId: 8, IsPrimary: true },
        ],
      }),
    ).toBe(8);
  });

  test("falls back to the first ContactAccount when none is IsPrimary", () => {
    expect(
      getPrimaryAccountId({
        ...baseContact,
        ContactAccounts: [
          { AccountId: 7, IsPrimary: false },
          { AccountId: 8, IsPrimary: false },
        ],
      }),
    ).toBe(7);
  });

  test("returns null when ContactAccounts is empty or missing", () => {
    expect(getPrimaryAccountId({ ...baseContact, ContactAccounts: [] })).toBeNull();
    expect(getPrimaryAccountId({ ...baseContact, ContactAccounts: null })).toBeNull();
  });
});

describe("getOldestMembership", () => {
  test("returns the membership with the earliest CreateDate", () => {
    const memberships: ProClassMembership[] = [
      { AccountId: 1, MembershipType: "Standard", MembershipStatus: "Canceled", CreateDate: "2022-06-01" },
      { AccountId: 1, MembershipType: "Lifetime", MembershipStatus: "Active", CreateDate: "2010-01-15" },
      { AccountId: 1, MembershipType: "Standard", MembershipStatus: "Canceled", CreateDate: "2018-09-09" },
    ];
    expect(getOldestMembership(memberships)?.MembershipType).toBe("Lifetime");
  });

  test("returns null on empty array", () => {
    expect(getOldestMembership([])).toBeNull();
  });
});

describe("getActiveMembership", () => {
  test("returns the only Active membership", () => {
    const memberships: ProClassMembership[] = [
      { AccountId: 1, MembershipType: "Bronze", MembershipStatus: "Canceled", CreateDate: "2020-01-01" },
      { AccountId: 1, MembershipType: "Shop - Silver Current", MembershipStatus: "Active", CreateDate: "2024-03-15" },
    ];
    expect(getActiveMembership(memberships)?.MembershipType).toBe("Shop - Silver Current");
  });

  test("when multiple Active rows exist, prefers the most recent CreateDate", () => {
    const memberships: ProClassMembership[] = [
      { AccountId: 1, MembershipType: "Bronze", MembershipStatus: "Active", CreateDate: "2022-06-01" },
      { AccountId: 1, MembershipType: "Shop - Gold Current", MembershipStatus: "Active", CreateDate: "2025-01-15" },
    ];
    expect(getActiveMembership(memberships)?.MembershipType).toBe("Shop - Gold Current");
  });

  test("returns null when no membership is Active", () => {
    const memberships: ProClassMembership[] = [
      { AccountId: 1, MembershipType: "Bronze", MembershipStatus: "Canceled", CreateDate: "2020-01-01" },
    ];
    expect(getActiveMembership(memberships)).toBeNull();
  });

  test("returns null on empty array", () => {
    expect(getActiveMembership([])).toBeNull();
  });
});

describe("projectMember", () => {
  test("returns null when contact has no email", () => {
    expect(projectMember({ ...baseContact, Email: null }, [])).toBeNull();
  });

  test("projects membership from the Active row and memberSince from the oldest row", () => {
    const projected = projectMember(baseContact, [
      { AccountId: 99, MembershipType: "Bronze", MembershipStatus: "Canceled", CreateDate: "2015-04-12" },
      { AccountId: 99, MembershipType: "Shop - Gold Current", MembershipStatus: "Active", CreateDate: "2024-08-01" },
    ]);
    expect(projected).toEqual({
      memberId: "12345",
      email: "a@example.com",
      phone: null,
      firstName: "Ada",
      lastName: "Lovelace",
      address: null,
      membership: "Shop - Gold Current",
      memberSince: "2015-04-12",
    });
  });

  test("leaves membership null when no Active row exists, but still sets memberSince", () => {
    const projected = projectMember(baseContact, [
      { AccountId: 99, MembershipType: "Bronze", MembershipStatus: "Canceled", CreateDate: "2015-04-12" },
    ]);
    expect(projected?.membership).toBeNull();
    expect(projected?.memberSince).toBe("2015-04-12");
  });

  test("leaves both null when no memberships found", () => {
    const projected = projectMember(baseContact, []);
    expect(projected?.membership).toBeNull();
    expect(projected?.memberSince).toBeNull();
  });
});

describe("joinContactsAndMemberships", () => {
  test("drops contacts without email and joins by AccountId", () => {
    const contacts: ProClassContact[] = [
      baseContact,
      { ...baseContact, ContactId: 2, Email: null },
      {
        ...baseContact,
        ContactId: 3,
        ContactAccounts: [{ AccountId: 100, IsPrimary: true }],
      },
    ];
    const map = new Map<number, ProClassMembership[]>();
    map.set(99, [
      { AccountId: 99, MembershipType: "Gold", MembershipStatus: "Active", CreateDate: "2015-04-12" },
    ]);
    const out = joinContactsAndMemberships(contacts, map);
    expect(out.map((m) => m.memberId)).toEqual(["12345", "3"]);
    expect(out[0]?.membership).toBe("Gold");
    expect(out[1]?.membership).toBeNull(); // no memberships under AccountId 100
  });
});
