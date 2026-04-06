import { drizzle } from "drizzle-orm/node-postgres";

import * as schema from "./db/schema";

export const db = drizzle(process.env.DATABASE_CONNECTION_STRING!, { schema });
export {
	reporterTable,
	toolTable,
	maintainerTable,
	toolMaintainerTable,
	statusesTable,
	logEntryTable,
} from "./db/schema";
