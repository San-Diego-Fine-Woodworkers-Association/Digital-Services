import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';

import * as schema from './db/schema';
import * as authSchema from './db/auth-schema';

const allSchemas = { ...schema, ...authSchema };

export const db = drizzle(process.env.DATABASE_CONNECTION_STRING!, { schema: allSchemas });
export {
	fairDetailsTable,
	shiftsTable,
	timeSlotsTable,
	registrationsTable,
	adminUsersTable
} from './db/schema';