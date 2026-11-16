import { describe, expect, test } from "bun:test";

import { maskEmail } from "@/lib/auth/mask-email";

describe("maskEmail", () => {
  test("keeps the first character and the domain", () => {
    expect(maskEmail("jane.doe@gmail.com")).toBe("j•••@gmail.com");
  });

  test("handles single-character local parts", () => {
    expect(maskEmail("j@x.org")).toBe("j•••@x.org");
  });

  test("fully masks values without a usable local part", () => {
    expect(maskEmail("@x.org")).toBe("•••");
    expect(maskEmail("not-an-email")).toBe("•••");
  });
});
