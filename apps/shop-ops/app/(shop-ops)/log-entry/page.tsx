import { desc } from "drizzle-orm";

import { DataTableSection } from "@/app/components/data-table-section";
import { db } from "@/lib/db";
import { logEntryTable } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function LogEntryPage() {
	const logEntries = await db
		.select()
		.from(logEntryTable)
		.orderBy(desc(logEntryTable.id));

	const columns = ["ID", "Tool ID", "Reporter ID", "Status ID", "Date", "Title", "Deleted"];
	const rows = logEntries.map((row) => ({
		ID: row.id,
		"Tool ID": row.toolId,
		"Reporter ID": row.reporterId,
		"Status ID": row.statusId,
		Date: row.date.toISOString(),
		Title: row.title,
		Deleted: String(row.deleted),
	}));

	return <DataTableSection heading="Log Entry" columns={columns} rows={rows} />;
}
