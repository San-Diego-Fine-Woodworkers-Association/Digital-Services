import { relations } from "drizzle-orm";
import { date, integer, pgTable, text, time, uuid } from "drizzle-orm/pg-core";

import { user } from "./auth-schema";

// START TEMP USER TABLES
export const adminUsersTable = pgTable("admin_users", {
	memberId: uuid().primaryKey().defaultRandom().unique()
});

export const membershipTable = pgTable("membership", {
	memberId: text().primaryKey().notNull().unique(),
	email: text().notNull(),
	membership: text().notNull()
});
// END TEMP USER TABLES

export const shiftsTable = pgTable("shifts", {
	id: uuid().primaryKey().defaultRandom().unique(),
	name: text().notNull()
});

export const timeSlotsTable = pgTable("time_slots", {
	id: uuid().primaryKey().defaultRandom().unique(),
	shiftId: uuid().notNull().references(() => shiftsTable.id),
	date: date({ mode: "date" }).notNull(),
	startTime: time({ withTimezone: false }).notNull(),
	endTime: time({ withTimezone: false }).notNull(),
	numberOfVolunteers: integer().notNull()
});

export const registrationsTable = pgTable("registrations", {
	id: uuid().primaryKey().defaultRandom().unique(),
	timeSlotId: uuid().notNull().references(() => timeSlotsTable.id),
	memberId: text().notNull()
});

export const timeSlotRelations = relations(timeSlotsTable, ({ one, many }) => ({
	shift: one(shiftsTable, {
		fields: [timeSlotsTable.shiftId],
		references: [shiftsTable.id]
	}),
	registrations: many(registrationsTable)
}));

export const registrationRelations = relations(registrationsTable, ({ one }) => ({
	timeSlot: one(timeSlotsTable, {
		fields: [registrationsTable.timeSlotId],
		references: [timeSlotsTable.id]
	})
}));

export const shiftRelations = relations(shiftsTable, ({ many }) => ({
	timeSlots: many(timeSlotsTable)
}));

export const userTimeSlotRelations = relations(user, ({ many }) => ({
	registrations: many(timeSlotsTable)
}));
