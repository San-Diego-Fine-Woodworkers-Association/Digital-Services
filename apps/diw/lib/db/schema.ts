import { relations } from "drizzle-orm";
import { boolean, date, integer, json, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { user } from "./auth-schema";

// START TEMP USER TABLES
export const adminUsersTable = pgTable("admin_users", {
	memberId: text().primaryKey()
});

export const membershipTable = pgTable("membership", {
	memberId: text().primaryKey().notNull().unique(),
	email: text().notNull(),
	membership: text().notNull()
});
// END TEMP USER TABLES

export const fairDetailsTable = pgTable("fair_details", {
  id: uuid().primaryKey().defaultRandom().unique(),
	name: text().notNull(),
	startDate: date().notNull(),
	endDate: date().notNull(),
	closedDates: json().$type<string[]>().notNull().default([]),
});

export const rolesTable = pgTable("roles", {
	id: uuid().primaryKey().defaultRandom().unique(),
	fairId: uuid().notNull().references(() => fairDetailsTable.id),
	name: text().notNull(),
	numberOfVolunteers: integer().notNull()
});

export const slotsTable = pgTable("slots", {
	id: uuid().primaryKey().defaultRandom().unique(),
	roleId: uuid().notNull().references(() => rolesTable.id),
	date: date().notNull(),
	startTime: timestamp().notNull(),
	endTime: timestamp().notNull(),
	numberOfVolunteers: integer().notNull()
});

export const registrationsTable = pgTable("registrations", {
	id: uuid().primaryKey().defaultRandom().unique(),
	slotId: uuid().notNull().references(() => slotsTable.id),
	userId: text().notNull().references(() => user.id)
});

export const userSettingsTable = pgTable("user_settings", {
	memberId: text().primaryKey().references(() => user.memberId, { onDelete: "cascade" }),
	fairId: uuid().references(() => fairDetailsTable.id, { onDelete: "set null" }),
	contactValidated: boolean().notNull().default(false),
});

export const fairDetailsRelations = relations(fairDetailsTable, ({ many }) => ({
	roles: many(rolesTable)
}));

export const roleRelations = relations(rolesTable, ({ one, many }) => ({
	fair: one(fairDetailsTable, {
		fields: [rolesTable.fairId],
		references: [fairDetailsTable.id]
	}),
	slots: many(slotsTable)
}));

export const slotRelations = relations(slotsTable, ({ one, many }) => ({
	role: one(rolesTable, {
		fields: [slotsTable.roleId],
		references: [rolesTable.id]
	}),
	registrations: many(registrationsTable)
}));

export const registrationRelations = relations(registrationsTable, ({ one }) => ({
	slot: one(slotsTable, {
		fields: [registrationsTable.slotId],
		references: [slotsTable.id]
	}),
	user: one(user, {
		fields: [registrationsTable.userId],
		references: [user.id]
	})
}));

export const userSlotRelations = relations(user, ({ many }) => ({
	registrations: many(registrationsTable)
}));

export const userSettingsRelations = relations(userSettingsTable, ({ one }) => ({
	fair: one(fairDetailsTable, {
		fields: [userSettingsTable.fairId],
		references: [fairDetailsTable.id],
	}),
}));
