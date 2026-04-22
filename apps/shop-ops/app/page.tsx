import { desc } from "drizzle-orm";
import Link from "next/link";

import { db } from "@/lib/db";
import { reporterTable } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

type PageProps = {
	searchParams?: Promise<{
		section?: string | string[];
	}>;
};

export default async function Page({ searchParams }: PageProps) {
	const resolvedSearchParams = searchParams ? await searchParams : undefined;
	const sectionParam = resolvedSearchParams?.section;
	const selectedSection = Array.isArray(sectionParam)
		? sectionParam[0] ?? ""
		: sectionParam ?? "";
	const showReporters = selectedSection === "reporters";

	const reporters = showReporters
		? await db.select().from(reporterTable).orderBy(desc(reporterTable.reportId))
		: [];

	return (
		<main className="mx-auto flex max-w-6xl gap-8 p-8">
			<aside className="w-56 shrink-0 rounded-lg border border-border bg-card p-4">
				<h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
					Navigation
				</h2>
				<nav>
					<Link
						href="/?section=reporters"
						className={`block rounded-md px-3 py-2 text-sm transition-colors ${
							showReporters
								? "bg-primary text-primary-foreground"
								: "text-card-foreground hover:bg-accent hover:text-accent-foreground"
						}`}
					>
						Reporters
					</Link>
				</nav>
			</aside>

			<section className="min-w-0 flex-1">
				<h1 className="text-2xl font-semibold tracking-tight">Shop Ops</h1>
				{showReporters ? (
					<div className="mt-6 overflow-x-auto rounded-lg border border-border">
						<table className="min-w-full divide-y divide-border text-sm">
							<thead className="bg-muted/50">
								<tr>
									<th className="px-4 py-3 text-left font-medium">Report ID</th>
									<th className="px-4 py-3 text-left font-medium">Name</th>
									<th className="px-4 py-3 text-left font-medium">Email</th>
									<th className="px-4 py-3 text-left font-medium">Member ID</th>
									<th className="px-4 py-3 text-left font-medium">Deleted</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-border">
								{reporters.length === 0 ? (
									<tr>
										<td colSpan={5} className="px-4 py-6 text-muted-foreground">
											No reporters yet.
										</td>
									</tr>
								) : (
									reporters.map((row) => (
										<tr key={row.reportId} className="bg-card">
											<td className="px-4 py-3">{row.reportId}</td>
											<td className="px-4 py-3 font-medium">{row.name}</td>
											<td className="px-4 py-3">{row.email}</td>
											<td className="px-4 py-3">{row.memberId}</td>
											<td className="px-4 py-3">{String(row.deleted)}</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				) : (
					<p className="mt-6 text-sm text-muted-foreground">
						Choose an item from the left navigation to view data.
					</p>
				)}
			</section>
		</main>
	);
}
