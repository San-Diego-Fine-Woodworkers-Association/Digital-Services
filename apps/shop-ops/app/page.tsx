import { desc } from "drizzle-orm";

import { db } from "@/lib/db";
import { reporterTable } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function Page() {
	const reporters = await db
		.select()
		.from(reporterTable)
		.orderBy(desc(reporterTable.reportId));

	return (
		<main className="mx-auto max-w-3xl p-8">
			<h1 className="text-2xl font-semibold tracking-tight">Shop Ops — Reporters</h1>
			<ul className="mt-6 space-y-3">
				{reporters.length === 0 ? (
					<li className="text-muted-foreground text-sm">No reporters yet.</li>
				) : (
					reporters.map((row) => (
						<li
							key={row.reportId}
							className="rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm"
						>
							<div className="font-medium">{row.name}</div>
							<div className="text-muted-foreground text-sm">{row.email}</div>
							<div className="mt-1 text-muted-foreground text-xs">
								report_id: {row.reportId}
								{" · "}
								member_id: {row.memberId}
								{" · "}
								deleted: {String(row.deleted)}
							</div>
						</li>
					))
				)}
			</ul>
		</main>
	);
}
