import { desc } from "drizzle-orm";

import { DataTableSection } from "@/app/components/data-table-section";
import { db } from "@/lib/db";
import { toolMaintainerTable } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function ToolMaintainerPage() {
	const toolMaintainers = await db
		.select()
		.from(toolMaintainerTable)
		.orderBy(desc(toolMaintainerTable.id));

	const columns = ["ID", "Tool ID", "Maintainer ID"];
	const rows = toolMaintainers.map((row) => ({
		ID: row.id,
		"Tool ID": row.toolId,
		"Maintainer ID": row.maintainerId,
	}));

	return <DataTableSection heading="Tool Maintainer" columns={columns} rows={rows} />;
}
