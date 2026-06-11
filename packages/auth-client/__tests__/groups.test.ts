import { describe, expect, test } from "bun:test";

import { hasAllGroups, hasAnyGroup, hasGroup } from "../src/groups";

describe("hasGroup", () => {
  test("true when group is present", () => {
    expect(hasGroup(["a@sdfwa.org", "b@sdfwa.org"], "a@sdfwa.org")).toBe(true);
  });
  test("false when missing", () => {
    expect(hasGroup(["a@sdfwa.org"], "b@sdfwa.org")).toBe(false);
  });
  test("false on empty user groups", () => {
    expect(hasGroup([], "a@sdfwa.org")).toBe(false);
  });
  test("case-sensitive", () => {
    expect(hasGroup(["A@sdfwa.org"], "a@sdfwa.org")).toBe(false);
  });
});

describe("hasAnyGroup", () => {
  test("true when intersection non-empty", () => {
    expect(hasAnyGroup(["a@sdfwa.org", "b@sdfwa.org"], ["b@sdfwa.org", "c@sdfwa.org"])).toBe(true);
  });
  test("false when no overlap", () => {
    expect(hasAnyGroup(["a@sdfwa.org"], ["b@sdfwa.org"])).toBe(false);
  });
  test("false when allowed list empty (default-closed)", () => {
    expect(hasAnyGroup(["a@sdfwa.org"], [])).toBe(false);
  });
  test("false when user groups empty", () => {
    expect(hasAnyGroup([], ["a@sdfwa.org"])).toBe(false);
  });
});

describe("hasAllGroups", () => {
  test("true when user has every required group", () => {
    expect(hasAllGroups(["a@sdfwa.org", "b@sdfwa.org", "c@sdfwa.org"], ["a@sdfwa.org", "b@sdfwa.org"])).toBe(true);
  });
  test("false when missing one", () => {
    expect(hasAllGroups(["a@sdfwa.org"], ["a@sdfwa.org", "b@sdfwa.org"])).toBe(false);
  });
  test("false when required list empty (default-closed)", () => {
    expect(hasAllGroups(["a@sdfwa.org"], [])).toBe(false);
  });
});
