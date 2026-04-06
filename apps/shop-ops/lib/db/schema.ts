import { boolean, pgTable, text, uuid } from "drizzle-orm/pg-core";

export const reporterTable = pgTable("reporter", {
	reportId: uuid("report_id").primaryKey().defaultRandom(),
	memberId: text("member_id").notNull(),
	email: text("email").notNull(),
	name: text("name").notNull(),
	deleted: boolean("deleted").notNull().default(false),
});
