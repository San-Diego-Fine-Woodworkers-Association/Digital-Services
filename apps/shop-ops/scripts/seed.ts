import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { seed } from "drizzle-seed";

import { reporterTable } from "../lib/db/schema";

config({ path: ".env.local" });

const connectionString = process.env.DATABASE_CONNECTION_STRING;
if (!connectionString) {
	throw new Error("DATABASE_CONNECTION_STRING is not set (expected in .env.local)");
}

const db = drizzle(connectionString, { schema: { reporterTable } });

async function main() {
	await seed(db, { reporterTable }, { count: 8, seed: 42 });
}

main()
	.then(() => {
		console.log("Seed completed.");
		process.exit(0);
	})
	.catch((err) => {
		console.error(err);
		process.exit(1);
	});
