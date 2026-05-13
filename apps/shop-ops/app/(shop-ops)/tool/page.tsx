import { desc } from "drizzle-orm";

import { DataTableSection } from "@/app/components/data-table-section";
import { db } from "@/lib/db";
import { toolTable } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function ToolPage() {
	const tools = await db.select().from(toolTable).orderBy(desc(toolTable.id));

	const columns = ["ID", "Name", "Serial Number", "Deleted"];
	const rows = tools.map((row) => ({
		ID: row.id,
		Name: row.name,
		"Serial Number": row.serialNumber,
		Deleted: String(row.deleted),
	}));

	return <DataTableSection heading="Tool" columns={columns} rows={rows} />;
}
