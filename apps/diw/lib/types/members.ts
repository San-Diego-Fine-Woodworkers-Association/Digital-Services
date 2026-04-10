/**
 * Types for membership import feature
 */

/**
 * Raw CSV row as parsed from file
 */
export type MembersCsvRow = {
  "Member ID": string;
  Name: string;
  Email: string;
  Membership: string;
  Address: string;
  Admin: string; // "true" or "false"
};

/**
 * Parsed and validated member data
 */
export type MemberData = {
  memberId: string;
  name: string;
  email: string;
  membership: string;
  address: string;
  isAdmin: boolean;
};

/**
 * Member from database (combined from user, membership, and admin_users tables)
 */
export type DbMember = MemberData & {
  userId: string;
};

/**
 * Changes to be applied during import
 */
export type MemberDiff = {
  toAdd: MemberData[];
  toUpdate: Array<{ old: DbMember; new: MemberData }>;
  toDelete: DbMember[];
};

/**
 * Parse error details
 */
export type CsvParseError = {
  row: number;
  field: string;
  message: string;
};

/**
 * Result of CSV parsing
 */
export type ParseResult = {
  success: boolean;
  data?: MemberData[];
  errors?: CsvParseError[];
};

/**
 * Result of applying member changes
 */
export type ApplyChangesResult = {
  success: boolean;
  message?: string;
  error?: string;
};
