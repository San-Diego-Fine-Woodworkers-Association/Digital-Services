import { describe, expect, test } from "bun:test";

import { splitName } from "@/lib/name";

describe("splitName", () => {
  test("splits first and last name", () => {
    expect(splitName("Ada Lovelace")).toEqual({
      firstName: "Ada",
      lastName: "Lovelace",
    });
  });

  test("single token has empty last name", () => {
    expect(splitName("Cher")).toEqual({ firstName: "Cher", lastName: "" });
  });

  test("multi-part name keeps remainder as last name", () => {
    expect(splitName("Mary Jane Watson")).toEqual({
      firstName: "Mary",
      lastName: "Jane Watson",
    });
  });

  test("collapses extra whitespace", () => {
    expect(splitName("  Ada   Lovelace  ")).toEqual({
      firstName: "Ada",
      lastName: "Lovelace",
    });
  });

  test("empty and nullish inputs", () => {
    expect(splitName("")).toEqual({ firstName: "", lastName: "" });
    expect(splitName(null)).toEqual({ firstName: "", lastName: "" });
    expect(splitName(undefined)).toEqual({ firstName: "", lastName: "" });
  });
});
