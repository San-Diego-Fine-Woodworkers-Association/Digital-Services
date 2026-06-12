import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';

import * as schema from './db/schema';

export const db = drizzle(process.env.DATABASE_CONNECTION_STRING!, { schema });
export {
	fairDetailsTable,
	rolesTable,
	slotsTable,
	registrationsTable,
	userSettingsTable
} from './db/schema';
