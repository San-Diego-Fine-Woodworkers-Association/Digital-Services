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

export function fetchAllPrograms(): Promise<ProClassProgram[]> {
  return get<ProClassProgram[]>("/api/ProgramList");
}

export function fetchAllRegistrations(): Promise<ProClassRegistration[]> {
  return get<ProClassRegistration[]>("/api/RegistrationList");
}
