import { createHash, randomBytes } from "node:crypto";

export const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;
export const TRUSTED_DEVICE_TTL_MS = 90 * 24 * 60 * 60 * 1000;

/** 32 random bytes encoded as base64url (43 chars, ~256 bits of entropy). */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}

export function isExpired(expiresAt: Date, now = new Date()): boolean {
  return now.getTime() >= expiresAt.getTime();
}

export function buildConfirmUrl(token: string): string {
  const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3002";
  return `${base}/api/auth/magic-link/confirm?token=${encodeURIComponent(token)}`;
}
