import type {
  ProClassContact,
  ProClassMembership,
  ProClassProgram,
  ProClassRegistration,
} from "./types";

const BASE_URL = "https://api130.imperisoft.com";

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

/**
 * Returns every membership in ProClass, across all accounts, in one call
 * (~3s for SDFWA's ~4,500 memberships). Caller groups by AccountId.
 */
export function fetchAllMemberships(): Promise<ProClassMembership[]> {
  return get<ProClassMembership[]>("/api/Memberships");
}

/**
 * Returns every Program in ProClass, across all types, in one call
 * (~8,836 rows, ~12.5s per SDF-57's research). Caller filters by
 * ProgramType.Description.
 */
export function fetchAllPrograms(): Promise<ProClassProgram[]> {
  return get<ProClassProgram[]>("/api/ProgramList");
}

/**
 * Returns every registration in ProClass's full history (2017-present), in
 * one call (~14,264 rows, ~1.5s per SDF-57's research). No server-side date
 * filter is applied here — the lookback-vs-backfill window is a local,
 * in-memory filter the caller applies afterward.
 */
export function fetchAllRegistrations(): Promise<ProClassRegistration[]> {
  return get<ProClassRegistration[]>("/api/RegistrationList");
}
