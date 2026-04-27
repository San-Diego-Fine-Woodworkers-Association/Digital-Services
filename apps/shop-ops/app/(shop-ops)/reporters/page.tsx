import { desc } from "drizzle-orm";

import { DataTableSection } from "@/app/components/data-table-section";
import { db } from "@/lib/db";
import { reporterTable } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function ReportersPage() {
	const reporters = await db
		.select()
		.from(reporterTable)
		.orderBy(desc(reporterTable.reportId));

	const columns = ["Report ID", "Name", "Email", "Member ID", "Deleted"];
	const rows = reporters.map((row) => ({
		"Report ID": row.reportId,
		Name: row.name,
		Email: row.email,
		"Member ID": row.memberId,
		Deleted: String(row.deleted),
	}));

	return <DataTableSection heading="Reporters" columns={columns} rows={rows} />;
}
