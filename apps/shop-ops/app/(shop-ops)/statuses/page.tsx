import { desc } from "drizzle-orm";

import { DataTableSection } from "@/app/components/data-table-section";
import { db } from "@/lib/db";
import { statusesTable } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function StatusesPage() {
	const statuses = await db.select().from(statusesTable).orderBy(desc(statusesTable.id));

	const columns = ["ID", "Name", "Deleted"];
	const rows = statuses.map((row) => ({
		ID: row.id,
		Name: row.name,
		Deleted: String(row.deleted),
	}));

	return <DataTableSection heading="Statuses" columns={columns} rows={rows} />;
}
