import { describe, expect, test } from "bun:test";

import {
  getTier,
  hasAllClaims,
  hasAnyClaim,
  hasAnyTier,
  hasClaim,
  isMember,
} from "../src/claims";

const paying = ["member", "tier:gold"];
const staff = ["volunteer"];
const contact: string[] = []; // signed in, no entitlement

describe("hasClaim", () => {
  test("exact membership", () => {
    expect(hasClaim(paying, "member")).toBe(true);
    expect(hasClaim(paying, "volunteer")).toBe(false);
    expect(hasClaim(contact, "member")).toBe(false);
  });
});

describe("hasAnyClaim", () => {
  test("any-of, default-closed on empty allowed", () => {
    expect(hasAnyClaim(paying, ["member", "volunteer"])).toBe(true);
    expect(hasAnyClaim(staff, ["member", "volunteer"])).toBe(true);
    expect(hasAnyClaim(contact, ["member", "volunteer"])).toBe(false);
    expect(hasAnyClaim(paying, [])).toBe(false);
  });
});

describe("hasAllClaims", () => {
  test("all-of, default-closed on empty required", () => {
    expect(hasAllClaims(paying, ["member", "tier:gold"])).toBe(true);
    expect(hasAllClaims(paying, ["member", "tier:silver"])).toBe(false);
    expect(hasAllClaims(paying, [])).toBe(false);
  });
});

describe("isMember / hasAnyTier", () => {
  test("isMember reflects the member claim", () => {
    expect(isMember(paying)).toBe(true);
    expect(isMember(staff)).toBe(false);
    expect(isMember(contact)).toBe(false);
  });

  test("hasAnyTier matches tier:<level> claims", () => {
    expect(hasAnyTier(paying, ["gold", "silver"])).toBe(true);
    expect(hasAnyTier(paying, ["silver", "bronze"])).toBe(false);
    expect(hasAnyTier(contact, ["gold"])).toBe(false);
  });
});

describe("getTier", () => {
  test("extracts the typed tier from claims", () => {
    expect(getTier(paying)).toBe("gold");
    expect(getTier(["member", "tier:lifetime"])).toBe("lifetime");
  });

  test("null when no tier claim", () => {
    expect(getTier(staff)).toBeNull();
    expect(getTier(contact)).toBeNull();
  });
});
