import { desc } from "drizzle-orm";

import { DataTableSection } from "@/app/components/data-table-section";
import { db } from "@/lib/db";
import { maintainerTable } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function MaintainerPage() {
	const maintainers = await db
		.select()
		.from(maintainerTable)
		.orderBy(desc(maintainerTable.id));

	const columns = ["ID", "Name", "Email", "Deleted"];
	const rows = maintainers.map((row) => ({
		ID: row.id,
		Name: row.name,
		Email: row.email,
		Deleted: String(row.deleted),
	}));

	return <DataTableSection heading="Maintainer" columns={columns} rows={rows} />;
}
