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
| Auth | Shared SSO via `apps/auth` (Better-Auth backend), consumed through `@sdfwa/auth-client` |
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
Then create the database your connection string uses (e.g. `diw`, and `auth`
for the auth app) via Adminer or `psql`, and **apply migrations**:
```bash
bun run db:migrate
```
Run this every time you bring the database up against a fresh volume — it
applies all pending migrations across apps so your local schema matches
production.

> **Use `db:migrate`, not `db:push`, for the auth app.** `db:push` syncs the
> schema without recording Drizzle's migration journal, so a later
> `db:migrate` re-runs every migration from `0000` and fails with "relation
> already exists." If a local DB lands in that state, drop and recreate it,
> then `db:migrate`.

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
| `bun run link:design-system [app...]` | Point app(s) at a local `../design-system` checkout instead of the published `@sdwa/*` packages |
| `bun run unlink:design-system [app...]` | Restore the published `@sdwa/*` package versions |

## Testing local design-system changes

`@sdwa/components`/`@sdwa/tokens` come from the separate
[design-system](https://github.com/San-Diego-Fine-Woodworkers-Association/Design-System)
repo. To try a local change before it's published:

```bash
# once, sibling to this repo:
git clone git@github.com:San-Diego-Fine-Woodworkers-Association/Design-System.git ../design-system

bun run link:design-system        # links every app that depends on @sdwa/*
bun run link:design-system auth   # or just one app
```

The command prints exactly what to run per linked app, e.g.:

```bash
cd apps/auth && NODE_PATH=<...> SDWA_LOCAL_LINK=1 bun run dev   # or build
```

Copy that line rather than typing your own — the `NODE_PATH` value is
specific to what's currently installed and changes when dependencies update.
`SDWA_LOCAL_LINK=1` matters: Turbopack can't currently follow a package
linked from outside this repo (a
[known upstream limitation](https://github.com/vercel/next.js/issues/91896)),
so linked apps fall back to webpack for as long as they're linked; `NODE_PATH`
separately works around `@sdwa/tokens`' `@import "tailwindcss"` not resolving
through the link (also link-only — real installs don't need it). There's no
watch mode wired up — after each design-system source change, rerun
`bun run build` in `design-system` (or the whole `link:design-system` command
again) to pick it up.

Run `bun run unlink:design-system` when done to go back to the published
versions — don't commit a `package.json` with a `link:` dependency.

## Database
- **ORM:** Drizzle (schema and migrations live under `apps/diw/lib/db/` and `apps/diw/drizzle/`)
- **Config:** `apps/diw/drizzle.config.ts` (uses `DATABASE_CONNECTION_STRING`)

Generate and apply migrations:
```bash
bun run db:generate   # create migration files from schema changes (interactive)
bun run db:migrate    # apply pending migrations (run after `docker compose up`)
```
`db:generate` prompts when it can't tell a column rename from a drop+add —
pick the `~ old › new   rename column` option to preserve data. It emits DDL
only, so any data backfill/remap must be appended to the generated `.sql` by
hand.

## Workspaces
- `diw` — Main Next.js application for Design in Wood project.
- `@sdfwa/ui` — Shared UI components (Radix UI, Tailwind, etc.); used by `diw`.
- `@sdfwa/eslint-config` — Shared ESLint config (Next, React, TypeScript, Prettier).
- `@sdfwa/typescript-config` — Shared TypeScript base config.

## License
Proprietary.