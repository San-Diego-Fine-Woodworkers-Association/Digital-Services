import type { ProClassContact, ProClassMembership } from "./types";

const BASE_URL = "https://api130.imperisoft.com";
/** ProClass throttles aggressively. Plan: 15 AccountIds per query, ≤50 queries / 10s. */
const ACCOUNT_IDS_PER_QUERY = 15;
const MAX_QUERIES_PER_WINDOW = 50;
const RATE_LIMIT_WINDOW_MS = 10_000;

function authHeader(): string {
  const username = process.env.PROCLASS_USERNAME;
  const password = process.env.PROCLASS_PASSWORD;
  if (!username || !password) {
    throw new Error(
      "PROCLASS_USERNAME and PROCLASS_PASSWORD must be set to call the ProClass API.",
    );
  }
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: authHeader(), Accept: "application/json" },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `ProClass ${path} → ${res.status} ${res.statusText}${body ? `: ${body.slice(0, 300)}` : ""}`,
    );
  }
  return (await res.json()) as T;
}

/**
 * Slow call (1+ minute). Returns every contact in ProClass.
 */
export function fetchAllContacts(): Promise<ProClassContact[]> {
  return get<ProClassContact[]>("/api/Contacts");
}

function buildMembershipFilter(accountIds: number[]): string {
  // $filter=AccountId eq 1 or AccountId eq 2 ...
  return accountIds.map((id) => `AccountId eq ${id}`).join(" or ");
}

/**
 * Look up memberships for many accounts, batching 15 per request and
 * pacing the requests to stay under the 50-per-10s limit.
 * Returns a flat array; caller groups by AccountId.
 */
export async function fetchMembershipsByAccountIds(
  accountIds: number[],
): Promise<ProClassMembership[]> {
  if (accountIds.length === 0) return [];

  const batches: number[][] = [];
  for (let i = 0; i < accountIds.length; i += ACCOUNT_IDS_PER_QUERY) {
    batches.push(accountIds.slice(i, i + ACCOUNT_IDS_PER_QUERY));
  }

  const out: ProClassMembership[] = [];
  for (let i = 0; i < batches.length; i += MAX_QUERIES_PER_WINDOW) {
    const window = batches.slice(i, i + MAX_QUERIES_PER_WINDOW);
    const windowStarted = Date.now();
    const results = await Promise.all(
      window.map((batch) => {
        const filter = encodeURIComponent(buildMembershipFilter(batch));
        return get<ProClassMembership[]>(`/api/Memberships?$filter=${filter}`);
      }),
    );
    for (const arr of results) out.push(...arr);
    const elapsed = Date.now() - windowStarted;
    if (
      i + MAX_QUERIES_PER_WINDOW < batches.length &&
      elapsed < RATE_LIMIT_WINDOW_MS
    ) {
      await new Promise((r) => setTimeout(r, RATE_LIMIT_WINDOW_MS - elapsed));
    }
  }
  return out;
}
