Packages: `@sdfwa/db`

This package contains the Drizzle schema and a small helper to create a `drizzle` client.

Environment:
- Expects `DATABASE_URL` in environment for creating a Postgres connection.

Usage:

import { db, authSchema } from '@sdfwa/db'

Note: This is a minimal scaffold for local development and the MVP. Adjust types and migration tooling before production.
