import { desc } from "drizzle-orm";

import { LeftNav, type NavItem } from "@/app/components/left-nav";
import { db } from "@/lib/db";
import {
	logEntryTable,
	maintainerTable,
	reporterTable,
	statusesTable,
	toolMaintainerTable,
	toolTable,
} from "@/lib/db/schema";

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

	const navItems: NavItem[] = [
		{ key: "reporters", label: "Reporters" },
		{ key: "tool", label: "Tool" },
		{ key: "maintainer", label: "Maintainer" },
		{ key: "tool_maintainer", label: "Tool Maintainer" },
		{ key: "statuses", label: "Statuses" },
		{ key: "log_entry", label: "Log Entry" },
	];

	const validSections = new Set(navItems.map((item) => item.key));
	const activeSection = validSections.has(selectedSection) ? selectedSection : "";

	let heading = "";
	let columns: string[] = [];
	let rows: Array<Record<string, string>> = [];

	if (activeSection === "reporters") {
		const reporters = await db
			.select()
			.from(reporterTable)
			.orderBy(desc(reporterTable.reportId));
		heading = "Reporters";
		columns = ["Report ID", "Name", "Email", "Member ID", "Deleted"];
		rows = reporters.map((row) => ({
			"Report ID": row.reportId,
			Name: row.name,
			Email: row.email,
			"Member ID": row.memberId,
			Deleted: String(row.deleted),
		}));
	}

	if (activeSection === "tool") {
		const tools = await db.select().from(toolTable).orderBy(desc(toolTable.id));
		heading = "Tool";
		columns = ["ID", "Name", "Serial Number", "Deleted"];
		rows = tools.map((row) => ({
			ID: row.id,
			Name: row.name,
			"Serial Number": row.serialNumber,
			Deleted: String(row.deleted),
		}));
	}

	if (activeSection === "maintainer") {
		const maintainers = await db
			.select()
			.from(maintainerTable)
			.orderBy(desc(maintainerTable.id));
		heading = "Maintainer";
		columns = ["ID", "Name", "Email", "Deleted"];
		rows = maintainers.map((row) => ({
			ID: row.id,
			Name: row.name,
			Email: row.email,
			Deleted: String(row.deleted),
		}));
	}

	if (activeSection === "tool_maintainer") {
		const toolMaintainers = await db
			.select()
			.from(toolMaintainerTable)
			.orderBy(desc(toolMaintainerTable.id));
		heading = "Tool Maintainer";
		columns = ["ID", "Tool ID", "Maintainer ID"];
		rows = toolMaintainers.map((row) => ({
			ID: row.id,
			"Tool ID": row.toolId,
			"Maintainer ID": row.maintainerId,
		}));
	}

	if (activeSection === "statuses") {
		const statuses = await db
			.select()
			.from(statusesTable)
			.orderBy(desc(statusesTable.id));
		heading = "Statuses";
		columns = ["ID", "Name", "Deleted"];
		rows = statuses.map((row) => ({
			ID: row.id,
			Name: row.name,
			Deleted: String(row.deleted),
		}));
	}

	if (activeSection === "log_entry") {
		const logEntries = await db
			.select()
			.from(logEntryTable)
			.orderBy(desc(logEntryTable.id));
		heading = "Log Entry";
		columns = ["ID", "Tool ID", "Reporter ID", "Status ID", "Date", "Title", "Deleted"];
		rows = logEntries.map((row) => ({
			ID: row.id,
			"Tool ID": row.toolId,
			"Reporter ID": row.reporterId,
			"Status ID": row.statusId,
			Date: row.date.toISOString(),
			Title: row.title,
			Deleted: String(row.deleted),
		}));
	}

	return (
		<main className="mx-auto flex max-w-6xl gap-8 p-8">
			<LeftNav items={navItems} selectedKey={activeSection} />

			<section className="min-w-0 flex-1">
				<h1 className="text-2xl font-semibold tracking-tight">Shop Ops</h1>
				{activeSection ? (
					<div className="mt-6 overflow-x-auto rounded-lg border border-border">
						<div className="border-b border-border px-4 py-3 text-sm font-medium">{heading}</div>
						<table className="min-w-full divide-y divide-border text-sm">
							<thead className="bg-muted/50">
								<tr>
									{columns.map((column) => (
										<th key={column} className="px-4 py-3 text-left font-medium">
											{column}
										</th>
									))}
								</tr>
							</thead>
							<tbody className="divide-y divide-border">
								{rows.length === 0 ? (
									<tr>
										<td colSpan={columns.length} className="px-4 py-6 text-muted-foreground">
											No rows found.
										</td>
									</tr>
								) : (
									rows.map((row, rowIndex) => (
										<tr key={`${heading}-${rowIndex}`} className="bg-card">
											{columns.map((column) => (
												<td key={column} className="px-4 py-3">
													{row[column]}
												</td>
											))}
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
