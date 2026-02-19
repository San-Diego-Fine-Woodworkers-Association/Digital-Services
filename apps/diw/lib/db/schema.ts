import { relations } from "drizzle-orm";
import { date, integer, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { user } from "./auth-schema";

// START TEMP USER TABLES
export const additionalRolesTable = pgTable("member_roles", {
	memberId: uuid().primaryKey().defaultRandom().unique(),
	role: text("role").notNull(),
});

export const adminUsersTable = pgTable("admin_users", {
	memberId: uuid().primaryKey().defaultRandom().unique()
});
// END TEMP USER TABLES

export const fairDetailsTable = pgTable("fair_details", {
  id: uuid().primaryKey().defaultRandom().unique(),
	startDate: date().notNull(),
	endDate: date().notNull()
});

export const shiftsTable = pgTable("shifts", {
	id: uuid().primaryKey().defaultRandom().unique(),
	fairId: integer().notNull(),
	name: text().notNull(),
	dates: jsonb().notNull().$type<Date[]>(),
	startTime: date().notNull(),
	endTime: date().notNull(),
	numberOfVolunteers: integer().notNull()
});

export const timeSlotsTable = pgTable("time_slots", {
	id: uuid().primaryKey().defaultRandom().unique(),
	shiftId: uuid().notNull().references(() => shiftsTable.id),
	date: date().notNull(),
	startTime: date().notNull(),
	endTime: date().notNull(),
	numberOfVolunteers: integer().notNull()
});

export const registrationsTable = pgTable("registrations", {
	id: uuid().primaryKey().defaultRandom().unique(),
	timeSlotId: uuid().notNull().references(() => timeSlotsTable.id),
	memberId: text().notNull()
});

export const timeSlotRelations = relations(timeSlotsTable, ({ one }) => ({
	shift: one(shiftsTable, {
		fields: [timeSlotsTable.shiftId],
		references: [shiftsTable.id]
	})
}));

export const shiftRelations = relations(shiftsTable, ({ many }) => ({
	timeSlots: many(timeSlotsTable)
}));

export const userTimeSlotRelations = relations(user, ({ many }) => ({
	registrations: many(timeSlotsTable)
}));