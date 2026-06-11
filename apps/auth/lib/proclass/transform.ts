import type {
  ProClassAddress,
  ProClassContact,
  ProClassMembership,
  ProjectedMember,
} from "./types";

export function pickPhone(contact: ProClassContact): string | null {
  return contact.Mobile || contact.HomePhone || contact.WorkPhone || null;
}

export function pickPrimaryAddress(
  addresses: ProClassAddress[] | null | undefined,
): string | null {
  if (!addresses?.length) return null;
  const primary = addresses.find((a) => a.IsPrimary) ?? addresses[0];
  if (!primary) return null;
  const parts = [
    primary.StreetAddress1,
    primary.StreetAddress2,
    primary.City,
    primary.State?.Abbreviation,
    primary.PostalCode,
  ]
    .map((p) => (p ?? "").trim())
    .filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

export function getPrimaryAccountId(contact: ProClassContact): number | null {
  const accounts = contact.ContactAccounts;
  if (!accounts?.length) return null;
  const primary = accounts.find((a) => a.IsPrimary) ?? accounts[0];
  return primary?.AccountId ?? null;
}

export function getOldestMembership(
  memberships: ProClassMembership[],
): ProClassMembership | null {
  if (!memberships.length) return null;
  return memberships.reduce((oldest, m) => {
    if (!oldest.CreateDate) return m;
    if (!m.CreateDate) return oldest;
    return new Date(m.CreateDate) < new Date(oldest.CreateDate) ? m : oldest;
  });
}

/**
 * Pick the current active membership. If more than one row is Active
 * (renewals, overlapping shop tiers), prefer the most recently created.
 */
export function getActiveMembership(
  memberships: ProClassMembership[],
): ProClassMembership | null {
  const active = memberships.filter((m) => m.MembershipStatus === "Active");
  if (!active.length) return null;
  return active.reduce((latest, m) => {
    if (!latest.CreateDate) return m;
    if (!m.CreateDate) return latest;
    return new Date(m.CreateDate) > new Date(latest.CreateDate) ? m : latest;
  });
}

/**
 * Project a contact + its account's memberships into the row we upsert.
 * Returns null if the contact has no email (we can't sign anyone in without it).
 */
export function projectMember(
  contact: ProClassContact,
  memberships: ProClassMembership[],
): ProjectedMember | null {
  if (!contact.Email) return null;
  const oldest = getOldestMembership(memberships);
  const active = getActiveMembership(memberships);
  return {
    memberId: String(contact.ContactId),
    email: contact.Email,
    phone: pickPhone(contact),
    firstName: contact.FirstName ?? null,
    lastName: contact.LastName ?? null,
    address: pickPrimaryAddress(contact.Addresses),
    membership: active?.MembershipType ?? null,
    memberSince: oldest?.CreateDate
      ? new Date(oldest.CreateDate).toISOString().slice(0, 10)
      : null,
  };
}

export function joinContactsAndMemberships(
  contacts: ProClassContact[],
  membershipsByAccountId: Map<number, ProClassMembership[]>,
): ProjectedMember[] {
  const out: ProjectedMember[] = [];
  for (const contact of contacts) {
    const accountId = getPrimaryAccountId(contact);
    const memberships =
      accountId !== null ? (membershipsByAccountId.get(accountId) ?? []) : [];
    const projected = projectMember(contact, memberships);
    if (projected) out.push(projected);
  }
  return out;
}
