import { describe, expect, test } from "bun:test";

import { deriveEntitlement, deriveTier } from "@/lib/auth/entitlement";

describe("deriveTier", () => {
  test("maps real ProClass strings to colloquial tiers", () => {
    expect(deriveTier("Bronze")).toBe("bronze");
    expect(deriveTier("Bronze - TEST ONLY")).toBe("bronze");
    expect(deriveTier("Shop - Silver Current")).toBe("silver");
    expect(deriveTier("Shop - Silver Grandfather")).toBe("silver");
    expect(deriveTier("Shop - Silver $250")).toBe("silver");
    expect(deriveTier("Shop - Gold Current")).toBe("gold");
    expect(deriveTier("Shop - Gold FOUNDER")).toBe("gold");
    expect(deriveTier("SDFWA Lifetime")).toBe("lifetime");
  });

  test("prefers lifetime over level words", () => {
    expect(deriveTier("Gold Lifetime")).toBe("lifetime");
  });

  test("is null for no membership or unknown values", () => {
    expect(deriveTier(null)).toBeNull();
    expect(deriveTier(undefined)).toBeNull();
    expect(deriveTier("")).toBeNull();
    expect(deriveTier("Some New Tier")).toBeNull();
  });
});

describe("deriveEntitlement", () => {
  test("paying proclass member: member + tier claims, origin not leaked", () => {
    const e = deriveEntitlement("proclass", "Shop - Gold Current");
    expect(e.tier).toBe("gold");
    expect(e.claims).toEqual(["member", "tier:gold"]);
  });

  test("ProClass contact with no tier: empty claims (upsell state)", () => {
    const e = deriveEntitlement("proclass", null);
    expect(e.tier).toBeNull();
    expect(e.claims).toEqual([]);
  });

  test("google volunteer: volunteer claim, no tier", () => {
    const e = deriveEntitlement("google", null);
    expect(e.tier).toBeNull();
    expect(e.claims).toEqual(["volunteer"]);
  });

  test("unknown active membership yields no member claim", () => {
    const e = deriveEntitlement("proclass", "Some New Tier");
    expect(e.claims).toEqual([]);
  });

  test("only 'google' origin grants the volunteer claim (fail-closed)", () => {
    expect(deriveEntitlement("volunteer", null).claims).toEqual([]);
    expect(deriveEntitlement(null, null).claims).toEqual([]);
  });
});
