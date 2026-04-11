/**
 * This script runs the DB migrations using Drizzle and the existing migration files
 * in the drizzle folder.
 * 
 * Usage:
 *   1. Set the DATABASE_CONNECTION_STRING environment variable to your database connection string.
 *   2. Run the script using ts-node:
 * 
 *      DATABASE_CONNECTION_STRING=... bun tsx apps/diw/scripts/migrate.ts
 *      DATABASE_CONNECTION_STRING=... bun tsx apps/diw/scripts/migrate.ts path/to/migrations
 */
import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from 'drizzle-orm/node-postgres/migrator';

const { DATABASE_CONNECTION_STRING } = process.env;

if (!DATABASE_CONNECTION_STRING) {
	throw new Error("DATABASE_CONNECTION_STRING environment variable is not set.");
}

// Get migration folder path from command line arguments, default to "apps/diw/migrations"
const migrationsFolder = process.argv[2] || "apps/diw/drizzle";

const db = drizzle(DATABASE_CONNECTION_STRING);

await migrate(db, { migrationsFolder });