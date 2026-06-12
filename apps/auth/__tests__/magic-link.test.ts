import { describe, expect, test } from "bun:test";

import {
  buildConfirmUrl,
  generateToken,
  hashToken,
  isExpired,
  MAGIC_LINK_TTL_MS,
} from "@/lib/auth/magic-link";
import { checkLimit, resetLimit } from "@/lib/auth/rate-limit";

describe("magic-link tokens", () => {
  test("generateToken returns unique 43-char base64url strings", () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(a.length).toBe(43);
  });

  test("hashToken is deterministic and one-way", () => {
    const t = generateToken();
    expect(hashToken(t)).toBe(hashToken(t));
    expect(hashToken(t)).not.toBe(t);
  });

  test("isExpired flips at the TTL boundary", () => {
    const now = new Date(2026, 5, 1, 12, 0, 0);
    const justBeforeExpiry = new Date(now.getTime() + 1);
    const justAfterExpiry = new Date(now.getTime() - 1);
    expect(isExpired(justBeforeExpiry, now)).toBe(false);
    expect(isExpired(justAfterExpiry, now)).toBe(true);
  });

  test("buildConfirmUrl percent-encodes the token", () => {
    const url = buildConfirmUrl("a/b+c=d");
    expect(url).toContain("token=a%2Fb%2Bc%3Dd");
  });

  test("TTL is 15 minutes", () => {
    expect(MAGIC_LINK_TTL_MS).toBe(15 * 60 * 1000);
  });
});

describe("rate limiter", () => {
  test("allows up to max within the window, then blocks", () => {
    const key = `test-${Math.random()}`;
    const t0 = 1_000_000;
    for (let i = 0; i < 5; i++) {
      expect(checkLimit(key, 5, 60_000, t0 + i).ok).toBe(true);
    }
    const blocked = checkLimit(key, 5, 60_000, t0 + 5);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.retryAfterMs).toBeGreaterThan(0);
    resetLimit(key);
  });

  test("permits again after the window slides past old hits", () => {
    const key = `test-${Math.random()}`;
    const t0 = 1_000_000;
    for (let i = 0; i < 5; i++) checkLimit(key, 5, 1_000, t0 + i);
    expect(checkLimit(key, 5, 1_000, t0 + 1_500).ok).toBe(true);
    resetLimit(key);
  });
});
