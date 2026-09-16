import { describe, expect, test } from "bun:test";

import { isJunkContact, isJunkProgram } from "@/lib/ghl/filters";
import type { JunkCheckContact, JunkCheckProgram } from "@/lib/ghl/types";

const baseContact: JunkCheckContact = {
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
};

describe("isJunkContact", () => {
  test("real contacts are not junk", () => {
    expect(isJunkContact(baseContact)).toBe(false);
  });

  test("'fake' in first name only is not filtered", () => {
    expect(isJunkContact({ ...baseContact, firstName: "Fakename" })).toBe(
      false,
    );
  });

  test("'fake'/'test' in both first and last name is filtered", () => {
    expect(
      isJunkContact({ ...baseContact, firstName: "Test", lastName: "Fake" }),
    ).toBe(true);
  });

  test("proclassonline.com email is filtered regardless of name", () => {
    expect(
      isJunkContact({ ...baseContact, email: "someone@proclassonline.com" }),
    ).toBe(true);
  });

  test("proclassonline.com email match is case-insensitive", () => {
    expect(
      isJunkContact({ ...baseContact, email: "someone@ProClassOnline.COM" }),
    ).toBe(true);
  });

  test("lastname matching Testcustomer\\d* is filtered", () => {
    expect(isJunkContact({ ...baseContact, lastName: "Testcustomer" })).toBe(
      true,
    );
    expect(isJunkContact({ ...baseContact, lastName: "Testcustomer42" })).toBe(
      true,
    );
  });

  test("null firstName/lastName does not throw and is not junk on its own", () => {
    expect(
      isJunkContact({ ...baseContact, firstName: null, lastName: null }),
    ).toBe(false);
  });
});

describe("isJunkProgram", () => {
  const baseProgram: JunkCheckProgram = {
    title: "Introduction to Woodworking A",
    status: "Registered",
  };

  test("real, non-canceled programs are not junk", () => {
    expect(isJunkProgram(baseProgram)).toBe(false);
  });

  test("Canceled status alone is not sufficient to filter a real program", () => {
    expect(isJunkProgram({ ...baseProgram, status: "Canceled" })).toBe(false);
  });

  test("FAKE/TEST title alone (not Canceled) is not filtered", () => {
    expect(
      isJunkProgram({ ...baseProgram, title: "FAKE Program", status: "Registered" }),
    ).toBe(false);
  });

  test("FAKE/TEST title AND Canceled status is filtered", () => {
    expect(
      isJunkProgram({ ...baseProgram, title: "FAKE Program", status: "Canceled" }),
    ).toBe(true);
    expect(
      isJunkProgram({ ...baseProgram, title: "TEST Class", status: "Canceled" }),
    ).toBe(true);
  });
});
