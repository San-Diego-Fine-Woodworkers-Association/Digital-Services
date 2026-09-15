/**
 * GHL (GoHighLevel) API v2 calls only — no ProClass knowledge, no tag
 * derivation. Mirrors apps/auth/lib/proclass/client.ts's shape: thrown
 * errors on missing env vars, one small `request` helper underneath.
 *
 * Unverified against a live GHL account (no sandbox exists — see the map's
 * Decisions so far). Smoke-test against Isaac's own ProClass contact
 * (isaachsmith.29@gmail.com) before the real backfill ever runs, per
 * SDF-59's Further Notes — this is the one module dry-run mode exists to
 * let us validate without touching it.
 */

const BASE_URL = "https://services.leadconnectorhq.com";
const API_VERSION = "2021-07-28";
const MEMBER_SINCE_FIELD_NAME = "Member Since";

function authHeaders(): Record<string, string> {
  const token = process.env.GHL_PRIVATE_INTEGRATION_TOKEN;
  if (!token) {
    throw new Error(
      "GHL_PRIVATE_INTEGRATION_TOKEN must be set to call the GHL API.",
    );
  }
  return {
    Authorization: `Bearer ${token}`,
    Version: API_VERSION,
    "Content-Type": "application/json",
  };
}

export function ghlLocationId(): string {
  const id = process.env.GHL_LOCATION_ID;
  if (!id) {
    throw new Error("GHL_LOCATION_ID must be set to call the GHL API.");
  }
  return id;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init.headers as Record<string, string>) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `GHL ${init.method ?? "GET"} ${path} → ${res.status} ${res.statusText}${body ? `: ${body.slice(0, 300)}` : ""}`,
    );
  }
  return (await res.json()) as T;
}

export type UpsertContactInput = {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  /** Pass both, or neither, of the Member Since field id/value. */
  memberSinceFieldId?: string | null;
  memberSinceValue?: string | null;
};

export type UpsertContactResult = {
  contactId: string;
  isNew: boolean;
};

/**
 * Upsert-by-email. Per the map's confirmed GHL mechanics: this does NOT
 * touch tags (never pass a `tags` field here — it would overwrite the
 * whole tag list) — use addTags/removeTags for those. customFields rides
 * in the same call at no extra request cost, per SDF-58's decision, but its
 * overwrite-vs-merge semantics are the flagged unverified risk above.
 */
export async function upsertContactByEmail(
  input: UpsertContactInput,
): Promise<UpsertContactResult> {
  const body: Record<string, unknown> = {
    locationId: ghlLocationId(),
    email: input.email,
  };
  if (input.firstName) body.firstName = input.firstName;
  if (input.lastName) body.lastName = input.lastName;
  if (input.memberSinceFieldId && input.memberSinceValue) {
    body.customFields = [
      { id: input.memberSinceFieldId, field_value: input.memberSinceValue },
    ];
  }
  const result = await request<{ contact: { id: string }; new: boolean }>(
    "/contacts/upsert",
    { method: "POST", body: JSON.stringify(body) },
  );
  return { contactId: result.contact.id, isNew: result.new };
}

/** Incremental add — never clobbers a contact's other tags. */
export async function addTags(
  contactId: string,
  tags: string[],
): Promise<void> {
  if (!tags.length) return;
  await request(`/contacts/${contactId}/tags`, {
    method: "POST",
    body: JSON.stringify({ tags }),
  });
}

/** Incremental remove — never clobbers a contact's other tags. */
export async function removeTags(
  contactId: string,
  tags: string[],
): Promise<void> {
  if (!tags.length) return;
  await request(`/contacts/${contactId}/tags`, {
    method: "DELETE",
    body: JSON.stringify({ tags }),
  });
}

export type FoundContact = {
  id: string;
  tags: string[];
};

/**
 * Looks up an existing contact by email without upserting one. Used only
 * for the lapse path (tier-tag removal), which per SDF-59's spec must take
 * "no other action on the contact" — no upsert, no tag adds.
 */
export async function findContactByEmail(
  email: string,
): Promise<FoundContact | null> {
  const result = await request<{
    contacts: Array<{ id: string; tags?: string[] }>;
  }>("/contacts/search", {
    method: "POST",
    body: JSON.stringify({
      locationId: ghlLocationId(),
      query: email,
      pageLimit: 1,
    }),
  });
  const contact = result.contacts[0];
  return contact ? { id: contact.id, tags: contact.tags ?? [] } : null;
}

/**
 * Finds the "Member Since" Date custom field, creating it once if it
 * doesn't yet exist. Call once per run and reuse the id across every
 * upsert, rather than once per member.
 */
export async function getOrCreateMemberSinceFieldId(): Promise<string> {
  const existing = await request<{
    customFields: Array<{ id: string; name: string }>;
  }>(`/locations/${ghlLocationId()}/customFields`);
  const found = existing.customFields.find(
    (f) => f.name === MEMBER_SINCE_FIELD_NAME,
  );
  if (found) return found.id;

  const created = await request<{ id: string }>(
    `/locations/${ghlLocationId()}/customFields`,
    {
      method: "POST",
      body: JSON.stringify({
        name: MEMBER_SINCE_FIELD_NAME,
        dataType: "DATE",
        model: "contact",
      }),
    },
  );
  return created.id;
}
