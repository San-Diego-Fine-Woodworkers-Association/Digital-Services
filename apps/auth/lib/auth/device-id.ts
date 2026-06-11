import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "sdfwa_device_id";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year; trust is enforced server-side via trusted_devices

function secret(): string {
  const s = process.env.BETTER_AUTH_SECRET;
  if (!s) throw new Error("BETTER_AUTH_SECRET is required to sign device cookies");
  return s;
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function pack(deviceId: string): string {
  return `${deviceId}.${sign(deviceId)}`;
}

function unpack(raw: string | undefined): string | null {
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot < 0) return null;
  const deviceId = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expected = sign(deviceId);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return deviceId;
}

/**
 * Returns the existing device id from the signed cookie, or mints a new one
 * and writes it back. The cookie is HttpOnly and (in prod) scoped to .sdfwa.org.
 */
export async function getOrCreateDeviceId(): Promise<string> {
  const jar = await cookies();
  const existing = unpack(jar.get(COOKIE_NAME)?.value);
  if (existing) return existing;
  const fresh = randomUUID();
  jar.set(COOKIE_NAME, pack(fresh), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    domain: process.env.COOKIE_DOMAIN,
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
  return fresh;
}

/** Read-only access to the current device id, without minting. Returns null if missing/tampered. */
export async function readDeviceId(): Promise<string | null> {
  const jar = await cookies();
  return unpack(jar.get(COOKIE_NAME)?.value);
}
