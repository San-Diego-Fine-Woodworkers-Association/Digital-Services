import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';

export const db = drizzle(process.env.DATABASE_URL!);
export {
	fairDetailsTable,
	shiftsTable,
	timeSlotsTable,
	registrationsTable,
	additionalRolesTable,
	adminUsersTable
} from './db/schema';