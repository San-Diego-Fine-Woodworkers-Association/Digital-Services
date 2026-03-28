import { boolean, pgTable, text, uuid } from "drizzle-orm/pg-core";

export const reporterTable = pgTable("reporter", {
	memberId: uuid("member_id").primaryKey().defaultRandom(),
	email: text("email").notNull(),
	name: text("name").notNull(),
	deleted: boolean("deleted").notNull().default(false),
});
