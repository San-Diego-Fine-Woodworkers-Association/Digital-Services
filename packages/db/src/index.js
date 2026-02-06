import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema/auth.js';
const connectionString = process.env.DATABASE_URL || '';
const pool = new Pool({ connectionString });
export const client = pool;
export const db = drizzle(pool, { schema });
export const authSchema = schema;
