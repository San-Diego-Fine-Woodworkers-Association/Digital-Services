/**
 * Tiny in-memory sliding-window rate limiter. Per the SSO plan, this is
 * acceptable for one Dokploy instance; if we ever scale horizontally,
 * promote to a `login_attempts` table.
 */
const buckets = new Map<string, number[]>();

export type LimitResult = { ok: true } | { ok: false; retryAfterMs: number };

export function checkLimit(
  key: string,
  max: number,
  windowMs: number,
  now = Date.now(),
): LimitResult {
  const cutoff = now - windowMs;
  const hits = (buckets.get(key) ?? []).filter((t) => t > cutoff);
  if (hits.length >= max) {
    const retryAfterMs = hits[0]! + windowMs - now;
    buckets.set(key, hits);
    return { ok: false, retryAfterMs };
  }
  hits.push(now);
  buckets.set(key, hits);
  return { ok: true };
}

export function resetLimit(key: string): void {
  buckets.delete(key);
}
