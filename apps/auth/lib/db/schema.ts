import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth-schema";

/**
 * Mirror of ProClass contacts joined with their primary membership (if any).
 * Owned by the hourly ETL; never written from a sign-in path.
 */
export const proclassUsersTable = pgTable("proclass_users", {
  memberId: text("member_id").primaryKey(),
  email: text("email").notNull(),
  phone: text("phone"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  address: text("address"),
  membership: text("membership"),
  memberSince: date("member_since"),
  active: boolean("active").notNull().default(true),
  lastSyncedAt: timestamp("last_synced_at").notNull().defaultNow(),
});

/**
 * Volunteers provisioned via @sdfwa.org Google SSO.
 * Distinct from members — accounts are not auto-linked even at matching email.
 */
export const volunteersTable = pgTable("volunteers", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  googleSub: text("google_sub").notNull().unique(),
  email: text("email").notNull(),
  name: text("name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  groups: text("groups")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  lastGroupsSyncAt: timestamp("last_groups_sync_at"),
});

/**
 * Per-user trusted browser/device. Trust expires 90 days after issuedAt;
 * cookie alone isn't authoritative for the TTL check.
 */
export const trustedDevicesTable = pgTable(
  "trusted_devices",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    deviceId: text("device_id").notNull(),
    issuedAt: timestamp("issued_at").notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
    userAgent: text("user_agent"),
  },
  (table) => [primaryKey({ columns: [table.userId, table.deviceId] })],
);

/**
 * Magic-link tokens issued during first-login-per-device confirmation.
 * Single use; hashed; 15-min TTL.
 */
export const magicLinkTokensTable = pgTable("magic_link_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  deviceId: text("device_id").notNull(),
  tokenHash: text("token_hash").notNull(),
  pollTokenHash: text("poll_token_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  consumedAt: timestamp("consumed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * Observability for the hourly ProClass ETL.
 */
export const syncRunsTable = pgTable("sync_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  finishedAt: timestamp("finished_at"),
  status: text("status").notNull(), // 'running' | 'ok' | 'error'
  contactsScanned: integer("contacts_scanned").notNull().default(0),
  membersUpserted: integer("members_upserted").notNull().default(0),
  membersDeactivated: integer("members_deactivated").notNull().default(0),
  errorMessage: text("error_message"),
});

export const volunteersRelations = relations(volunteersTable, ({ one }) => ({
  user: one(user, {
    fields: [volunteersTable.userId],
    references: [user.id],
  }),
}));

export const trustedDevicesRelations = relations(
  trustedDevicesTable,
  ({ one }) => ({
    user: one(user, {
      fields: [trustedDevicesTable.userId],
      references: [user.id],
    }),
  }),
);

export const magicLinkTokensRelations = relations(
  magicLinkTokensTable,
  ({ one }) => ({
    user: one(user, {
      fields: [magicLinkTokensTable.userId],
      references: [user.id],
    }),
  }),
);

