import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { safeRedirect } from "@/lib/safe-redirect";

const ORIGINAL_DEFAULT = process.env.POST_LOGIN_DEFAULT_REDIRECT;

beforeEach(() => {
  process.env.POST_LOGIN_DEFAULT_REDIRECT = "https://www.sdfwa.org";
});

afterEach(() => {
  if (ORIGINAL_DEFAULT === undefined) {
    delete process.env.POST_LOGIN_DEFAULT_REDIRECT;
  } else {
    process.env.POST_LOGIN_DEFAULT_REDIRECT = ORIGINAL_DEFAULT;
  }
});

describe("safeRedirect", () => {
  test("falls back to default when raw is missing", () => {
    expect(safeRedirect(undefined)).toBe("https://www.sdfwa.org");
    expect(safeRedirect(null)).toBe("https://www.sdfwa.org");
    expect(safeRedirect("")).toBe("https://www.sdfwa.org");
  });

  test("allows a same-origin relative path", () => {
    expect(safeRedirect("/dashboard")).toBe("/dashboard");
    expect(safeRedirect("/a/b/c?x=1")).toBe("/a/b/c?x=1");
  });

  test("rejects protocol-relative URLs (// bypass)", () => {
    expect(safeRedirect("//evil.example/path")).toBe("https://www.sdfwa.org");
  });

  test("allows sdfwa.org and any subdomain", () => {
    expect(safeRedirect("https://www.sdfwa.org/members")).toBe(
      "https://www.sdfwa.org/members",
    );
    expect(safeRedirect("https://diw.sdfwa.org/register")).toBe(
      "https://diw.sdfwa.org/register",
    );
    expect(safeRedirect("https://sdfwa.org/")).toBe("https://sdfwa.org/");
  });

  test("allows localhost for dev", () => {
    expect(safeRedirect("http://localhost:3000/x")).toBe(
      "http://localhost:3000/x",
    );
    expect(safeRedirect("http://127.0.0.1:3001/")).toBe("http://127.0.0.1:3001/");
  });

  test("rejects off-domain URLs", () => {
    expect(safeRedirect("https://evil.example/login")).toBe(
      "https://www.sdfwa.org",
    );
    expect(safeRedirect("https://sdfwa.org.evil.example/")).toBe(
      "https://www.sdfwa.org",
    );
  });

  test("rejects non-http(s) schemes", () => {
    expect(safeRedirect("javascript:alert(1)")).toBe("https://www.sdfwa.org");
    expect(safeRedirect("data:text/html,<script>alert(1)</script>")).toBe(
      "https://www.sdfwa.org",
    );
  });

  test("rejects garbage", () => {
    expect(safeRedirect("not a url")).toBe("https://www.sdfwa.org");
  });
});
