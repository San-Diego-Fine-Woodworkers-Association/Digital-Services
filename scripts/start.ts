import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { spawn } from "child_process";

const { DATABASE_CONNECTION_STRING, APP_NAME_ENV } = process.env;

if (!DATABASE_CONNECTION_STRING) {
	throw new Error("DATABASE_CONNECTION_STRING environment variable is not set.");
}

if (!APP_NAME_ENV) {
	throw new Error("APP_NAME_ENV environment variable is not set.");
}

console.log("Running database migrations...");
const db = drizzle(DATABASE_CONNECTION_STRING);
await migrate(db, { migrationsFolder: "./drizzle" });
console.log("Migrations complete.");

console.log("Starting server...");
const server = spawn("node", [`apps/${APP_NAME_ENV}/server.js`], {
	stdio: "inherit",
});
server.on("exit", (code) => process.exit(code ?? 0));
