import { describe, expect, test } from "bun:test";

import { hasAllGroups, hasAnyGroup, hasGroup } from "../src/groups";

describe("hasGroup", () => {
  test("true when group is present", () => {
    expect(hasGroup(["a", "b"], "a")).toBe(true);
  });
  test("false when missing", () => {
    expect(hasGroup(["a"], "b")).toBe(false);
  });
  test("false on empty user groups", () => {
    expect(hasGroup([], "a")).toBe(false);
  });
  test("case-sensitive", () => {
    expect(hasGroup(["A"], "a")).toBe(false);
  });
});

describe("hasAnyGroup", () => {
  test("true when intersection non-empty", () => {
    expect(hasAnyGroup(["a", "b"], ["b", "c"])).toBe(true);
  });
  test("false when no overlap", () => {
    expect(hasAnyGroup(["a"], ["b"])).toBe(false);
  });
  test("false when allowed list empty (default-closed)", () => {
    expect(hasAnyGroup(["a"], [])).toBe(false);
  });
  test("false when user groups empty", () => {
    expect(hasAnyGroup([], ["a"])).toBe(false);
  });
});

describe("hasAllGroups", () => {
  test("true when user has every required group", () => {
    expect(hasAllGroups(["a", "b", "c"], ["a", "b"])).toBe(true);
  });
  test("false when missing one", () => {
    expect(hasAllGroups(["a"], ["a", "b"])).toBe(false);
  });
  test("false when required list empty (default-closed)", () => {
    expect(hasAllGroups(["a"], [])).toBe(false);
  });
});
