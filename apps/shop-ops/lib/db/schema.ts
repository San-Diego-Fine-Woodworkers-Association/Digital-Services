import {
	boolean,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

export const reporterTable = pgTable("reporter", {
	reportId: uuid("report_id").primaryKey().defaultRandom(),
	memberId: text("member_id").notNull(),
	email: text("email").notNull(),
	name: text("name").notNull(),
	deleted: boolean("deleted").notNull().default(false),
});

export const toolTable = pgTable("tool", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: text("name").notNull(),
	serialNumber: text("serial_number").notNull(),
	deleted: boolean("deleted").notNull().default(false),
});

export const maintainerTable = pgTable("maintainer", {
	id: uuid("id").primaryKey().defaultRandom(),
	email: text("email").notNull(),
	name: text("name").notNull(),
	deleted: boolean("deleted").notNull().default(false),
});

export const toolMaintainerTable = pgTable("tool_maintainer", {
	id: uuid("id").primaryKey().defaultRandom(),
	toolId: uuid("tool_id")
		.notNull()
		.references(() => toolTable.id),
	maintainerId: uuid("maintainer_id")
		.notNull()
		.references(() => maintainerTable.id),
});

export const statusesTable = pgTable("statuses", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: text("name").notNull(),
	deleted: boolean("deleted").notNull().default(false),
});

export const logEntryTable = pgTable("log_entry", {
	id: uuid("id").primaryKey().defaultRandom(),
	toolId: uuid("tool_id")
		.notNull()
		.references(() => toolTable.id),
	reporterId: uuid("reporter_id")
		.notNull()
		.references(() => reporterTable.reportId),
	statusId: uuid("status_id")
		.notNull()
		.references(() => statusesTable.id),
	date: timestamp("date", { withTimezone: true }).notNull(),
	title: text("title").notNull(),
	deleted: boolean("deleted").notNull().default(false),
});
