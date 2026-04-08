import "dotenv/config";
import { readFileSync } from "fs";
import { resolve } from "path";
import { drizzle } from "drizzle-orm/node-postgres";
import { membershipTable, adminUsersTable } from "../lib/db/schema";

const db = drizzle(process.env.DATABASE_CONNECTION_STRING!);

function parseCSV(content: string): Record<string, string>[] {
	const lines = content.trim().split("\n");
	const headers = lines[0]!.split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
	return lines.slice(1).map((line) => {
		const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
		return Object.fromEntries(headers.map((h, i) => [h, values[i] || ""]));
	});
}

async function seed() {
	const args = process.argv.slice(2);
	const csvPath = resolve(args[0] || "./data/members.csv");
	const adminCsvPath = args[1] ? resolve(args[1]) : null;

	console.log(`Reading members from: ${csvPath}`);
	const csvContent = readFileSync(csvPath, "utf-8");
	const rows = parseCSV(csvContent);

	console.log(`Found ${rows.length} members, upserting...`);

	for (const row of rows) {
		const memberId = row["memberId"] || row["member_id"] || row["MemberID"] || "";
		const email = row["email"] || row["Email"] || "";
		const membership = row["membership"] || row["Membership"] || "volunteer";

		if (!memberId || !email) {
			console.warn(`Skipping row with missing data: ${JSON.stringify(row)}`);
			continue;
		}

		await db
			.insert(membershipTable)
			.values({ memberId, email, membership })
			.onConflictDoUpdate({
				target: membershipTable.memberId,
				set: { email, membership },
			});
	}

	console.log(`Upserted ${rows.length} members.`);

	if (adminCsvPath) {
		console.log(`Reading admins from: ${adminCsvPath}`);
		const adminContent = readFileSync(adminCsvPath, "utf-8");
		const adminRows = parseCSV(adminContent);

		for (const row of adminRows) {
			const memberId = row["memberId"] || row["member_id"] || row["MemberID"] || "";
			if (!memberId) continue;

			await db
				.insert(adminUsersTable)
				.values({ memberId })
				.onConflictDoUpdate({
					target: adminUsersTable.memberId,
					set: { memberId },
				});
		}

		console.log(`Upserted ${adminRows.length} admins.`);
	}

	console.log("Seed complete.");
	process.exit(0);
}

seed().catch((err) => {
	console.error("Seed failed:", err);
	process.exit(1);
});
