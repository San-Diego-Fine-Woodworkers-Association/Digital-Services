/**
 * Raw ProClass (Imperisoft) API shapes we consume.
 * Field paths confirmed in sso-provider-app.md against api130.imperisoft.com.
 * Anything ProClass returns that we don't use is intentionally absent here.
 */

export type ProClassAddress = {
  IsPrimary: boolean;
  StreetAddress1: string | null;
  StreetAddress2: string | null;
  City: string | null;
  State: { Abbreviation: string | null } | null;
  PostalCode: string | null;
};

export type ProClassContactAccount = {
  AccountId: number;
  IsPrimary?: boolean | null;
};

export type ProClassContact = {
  ContactId: number;
  Email: string | null;
  Mobile: string | null;
  HomePhone: string | null;
  WorkPhone: string | null;
  FirstName: string | null;
  LastName: string | null;
  Addresses: ProClassAddress[] | null;
  ContactAccounts?: ProClassContactAccount[] | null;
};

export type ProClassMembership = {
  AccountId: number;
  MembershipType: string | null;
  MembershipStatus: string | null;
  CreateDate: string | null;
};

/**
 * Internal projection used to upsert into the members table.
 * memberId is the ProClass ContactId stringified.
 */
export type ProjectedMember = {
  memberId: string;
  email: string;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  address: string | null;
  membership: string | null;
  memberSince: string | null; // ISO date (YYYY-MM-DD) or null
};
