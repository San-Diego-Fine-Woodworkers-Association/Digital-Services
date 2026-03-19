# SDFWA Digital Services
A TypeScript monorepo for SDFWA digital services, built with Next.js, React, and PostgreSQL.

## Technology Stack
| Layer | Technology |
|---|---|
| Runtime | Node.js >= 24, [Bun](https://bun.sh) 1.3.x (package manager) |
| Language | TypeScript 5.9 |
| Monorepo | [Turborepo](https://turbo.build) |
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| Database | PostgreSQL, [Drizzle ORM](https://orm.drizzle.team) |
| Auth | [better-auth](https://www.better-auth.com) |
| Tooling | ESLint, Prettier |

## Repository Structure
```text
├── apps/
│   └── diw/                  # Next.js app (port 3000)
├── packages/
│   ├── ui/                  # Shared React components (@sdfwa/ui)
│   ├── eslint-config/      # Shared ESLint config (@sdfwa/eslint-config)
│   └── typescript-config/  # Shared TypeScript config (@sdfwa/typescript-config)
├── scripts/                  # Dev and automation scripts
├── docker-compose.yml        # Local PostgreSQL + Adminer
├── turbo.json
└── package.json
```

## Prerequisites
- Node.js >= 24
- Bun 1.3.x (`npm install -g bun` or see [bun.sh](https://bun.sh))
- Docker (optional, for local PostgreSQL via `docker compose`)

## Getting Started

### 1. Install dependencies
```bash
bun install
```

### 2. Environment variables
Create `.env` in `apps/diw/` (or at the repo root if the app loads it) with:
```env
DATABASE_CONNECTION_STRING=postgres://admin:admin@localhost:5432/diw
```
Adjust the URL if you use different Postgres credentials or host.

### 3. Start the database (optional)
For local Postgres + Adminer (DB UI on port `8080`):
```bash
docker compose up -d
```
Then create a database named `diw` if your connection string uses it (e.g. via Adminer or `psql`).

### 4. Run the app

**Development (app only):**
```bash
bun run dev --filter=diw
```
Open http://localhost:3000 (Next.js + Turbopack).

**Production build:**
```bash
bun run build --filter=diw
```
Then from `apps/diw`:
```bash
bun run start
```

## Scripts
| Command | Description |
|---|---|
| `bun dev` | Start all apps/packages in development mode |
| `bun run build` | Build all workspaces (Turbo) |
| `bun run start:dev` | Start Docker Compose + Turbo dev (via `scripts/dev.js`) |
| `bun run db:generate` | Generate Drizzle migrations |
| `bun run db:migrate` | Run Drizzle migrations |
| `bun run lint` | Lint all workspaces |
| `bun run format` | Format code with Prettier |

## Database
- **ORM:** Drizzle (schema and migrations live under `apps/diw/lib/db/` and `apps/diw/drizzle/`)
- **Config:** `apps/diw/drizzle.config.ts` (uses `DATABASE_CONNECTION_STRING`)

Generate and apply migrations:
```bash
bun run db:generate
bun run db:migrate
```

## Workspaces
- `diw` — Main Next.js application for Design in Wood project.
- `@sdfwa/ui` — Shared UI components (Radix UI, Tailwind, etc.); used by `diw`.
- `@sdfwa/eslint-config` — Shared ESLint config (Next, React, TypeScript, Prettier).
- `@sdfwa/typescript-config` — Shared TypeScript base config.

## License
Proprietary.