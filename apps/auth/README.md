# `auth` — SDFWA SSO provider

Single sign-on for everything under `*.sdfwa.org`. One Next.js app, deployed to
`auth.sdfwa.org`, that:

- Authenticates **members** with email + ProClass Member ID, plus a one-time
  magic-link confirmation per device (90-day trust).
- Authenticates **volunteers/staff** with `@sdfwa.org` Google Workspace
  accounts.
- Mints a JWT (EdDSA, JWKS-published) so consumer apps can read the session
  locally.
- Mirrors ProClass contacts and memberships into a local table on an hourly
  ETL so member sign-in works even when the ProClass API is slow or down,
  and so we can soft-revoke deactivated members.

Built on [Better-Auth](https://www.better-auth.com/) v1.4 with the Drizzle
Postgres adapter, the JWT plugin, a custom `memberLoginPlugin`, and Google as
the only social provider.

## Run it locally

1. Start the shared Postgres / Adminer pair from the repo root:
   ```bash
   docker compose up -d
   ```
2. Create the `auth` database (one-time):
   ```bash
   docker exec infrastructure-db-1 psql -U admin -d postgres -c "CREATE DATABASE auth;"
   ```
3. Apply migrations:
   ```bash
   bun run db:migrate --filter=auth
   ```
   Run this whenever you bring the DB up against a fresh volume, so the local
   schema matches production. **Use `db:migrate`, not `db:push`** — `db:push`
   skips Drizzle's migration journal, which makes a later `db:migrate` re-run
   everything from `0000` and fail with "relation already exists." If that
   happens, drop and recreate the `auth` database, then `db:migrate`.
4. Populate `apps/auth/.env` (see [Configuration](#configuration) below).
5. Start the dev server:
   ```bash
   bun dev --filter=auth
   ```
   The app comes up at `http://localhost:3002`.
6. Visit `/login` to exercise the flows. In dev, magic-link emails are **not
   sent** — the URL is returned in the API response and rendered on the
   pending screen with a "DEV ONLY" banner.
7. Visit `/whoami` to inspect the current session, device cookie,
   user row, trusted-devices list, and volunteer row.

To populate member records for sign-in testing, trigger the ETL once:

```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3002/api/cron/proclass-sync
```

You need valid `PROCLASS_USERNAME` / `PROCLASS_PASSWORD` for this. See
[docs/proclass-sync.md](docs/proclass-sync.md).

## Configuration

`.env` values required for local dev:

| Var | Purpose |
| --- | --- |
| `DATABASE_CONNECTION_STRING` | Postgres URL (`postgres://admin:admin@localhost:5432/auth`). |
| `BETTER_AUTH_SECRET` | 32+ bytes of randomness; signs device cookies and Better-Auth tokens. |
| `BETTER_AUTH_URL` | `http://localhost:3002` in dev. |
| `NEXT_PUBLIC_BASE_URL` | Same as `BETTER_AUTH_URL` for now. |
| `COOKIE_DOMAIN` | `localhost` in dev, `.sdfwa.org` in prod. |
| `CRON_SECRET` | Bearer token the Dokploy hourly cron presents to `/api/cron/proclass-sync`. |
| `SERVICE_TOKEN` | Bearer token for back-channel `/api/user/[memberId]` calls. |
| `POST_LOGIN_DEFAULT_REDIRECT` | Where to land users with no `?redirect=` param. Dev points at `/whoami`. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | See [docs/google-oauth.md](docs/google-oauth.md). |
| `GOOGLE_SERVICE_ACCOUNT_JSON_B64` / `GOOGLE_ADMIN_IMPERSONATION_SUBJECT` | Optional in dev. Enables Workspace-Group sync for volunteers. See [docs/workspace-groups.md](docs/workspace-groups.md). |
| `PROCLASS_USERNAME` / `PROCLASS_PASSWORD` | Basic-auth credentials for the ProClass API. |
| `RESEND_API_KEY` | Optional in dev (no emails sent). Required in prod. |
| `EMAIL_FROM` | `no-reply@auth.sdfwa.org`. |

## Repository layout

```
apps/auth
├── app/                       # Next.js App Router
│   ├── api/                   # Public + internal HTTP endpoints
│   ├── whoami/                # Auth session inspector
│   └── login/                 # /login UI
├── components/login-form.tsx  # Member + Google form
├── drizzle/                   # SQL migrations
├── emails/magic-link.tsx      # React Email template
├── lib/
│   ├── auth.ts                # Better-Auth instance + plugins
│   ├── auth/                  # member-login plugin, device cookie, magic-link helpers, rate limit, enforce-active
│   ├── db/                    # Drizzle schemas
│   ├── proclass/              # ETL client, transform, orchestration
│   ├── email/resend.ts        # Resend wrapper (dev-safe)
│   ├── cors.ts                # `*.sdfwa.org` allow-list
│   ├── observability.ts       # Structured logging
│   └── safe-redirect.ts       # Open-redirect guard
└── middleware.ts              # CORS for /api/session and /api/user
```

## Documentation

- [Architecture overview](docs/architecture.md) — how the pieces fit together.
- [API reference](docs/api-reference.md) — every endpoint, with shapes.
- [ProClass ETL](docs/proclass-sync.md) — the hourly sync and what to do when
  it breaks.
- [Integrating consumer apps](docs/integrating-apps.md) — how `diw`,
  `shop-ops`, and future apps consume sessions via `@sdfwa/auth-client`.
- [Google OAuth setup](docs/google-oauth.md) — Google Cloud Console steps for
  the volunteer flow.
- [Workspace groups](docs/workspace-groups.md) — group-based entitlements for
  volunteers via the Admin SDK.
- [Dokploy deployment](docs/dokploy-deployment.md) — production checklist.

## Tests

```bash
bun test           # unit tests (proclass transforms, magic-link, rate limit, redirect guard)
bun run typecheck  # tsc --noEmit
```
