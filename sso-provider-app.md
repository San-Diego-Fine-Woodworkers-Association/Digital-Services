# To Plan: SSO Provider App
Objective: To create a Next.JS app within the existing TurboRepo project structure to handle all auth for all other frontend consumers (NextJS apps, WordPress, etc.)

## Key Features
1. Two-pronged login approach: members and volunteers
2. Members database is maintained via a cron-running function that scrapes information out of our membership provider ProClass
3. Better-Auth will be the framework we use for handling auth
4. Utilities and other hooks will be made distributable to other applications within this TurboRepo project

## Application Architecture

### Placement in the Monorepo
A new Next.js 16 app lives at `apps/auth/` alongside `apps/diw` and `apps/shop-ops`, scaffolded against the same `@sdfwa/typescript-config`, `@sdfwa/eslint-config`, and `@sdfwa/ui` workspace packages. Deployed via the existing GitHub Actions + Dokploy pipeline (`Dockerfile.app.prod`, standalone Next.js output) and served at `auth.sdfwa.org`. All login surface area is under a single route — `auth.sdfwa.org/login` — with Better-Auth's API mounted at `auth.sdfwa.org/api/auth/*`.

### Two-Pronged Login Surface
The `/login` page renders one form with two paths:

- **Member login** — Email + Member ID (used as the password). Backed by a custom Better-Auth credential plugin (`memberLoginPlugin`, modeled on the one already in `apps/diw/lib/auth/member-login-plugin`) that validates against the `members` table populated by the ProClass ETL. No self-serve signup or password reset; the Member ID is the shared secret synced from ProClass. **First login per device requires email magic-link confirmation** — after successful credential check, the device is not trusted until the user clicks a one-time link sent to their member email. Trusted devices are tracked via a signed `device_id` cookie (separate from the session JWT, also scoped to `.sdfwa.org`) checked on each subsequent member login. Trust expires 90 days after the last successful magic-link confirmation, at which point the next login on that device requires re-confirmation. A `trusted_devices` table keyed on `(userId, deviceId)` stores the issued-at timestamp so server-side expiry is authoritative (cookie alone isn't trusted for the TTL check).
- **Volunteer SSO** — "Sign in with Google" button using Better-Auth's Google OAuth provider, restricted server-side to the `@sdfwa.org` hosted-domain (`hd` claim). First-time volunteer sign-in provisions a row in a `volunteers` table keyed by Google `sub`.

The form auto-detects intent (e.g., an `@sdfwa.org` email hides the password field and surfaces the Google button), but both flows remain reachable manually.

### Database
A dedicated Postgres schema for the auth app, managed with Drizzle ORM the same way `apps/diw` does it (`lib/db/schema.ts`, migrations under `drizzle/`, `DATABASE_CONNECTION_STRING` env var). Tables:

- `members` — write-target of the ProClass ETL (see schema below). Read-only from the auth flow's perspective.
- `volunteers` — Google-SSO-provisioned users.
- Better-Auth's own tables (`user`, `session`, `account`, `verification`) via the Drizzle adapter, used to back session state for both audiences.

### Session & JWT Strategy
Better-Auth issues a session and additionally signs a JWT (via its `jwt` plugin) carrying the claims downstream consumers need:

```
{
  sub:        "<uuid>",          // Better-Auth user id
  kind:       "member" | "volunteer",
  memberId:   number | null,     // ProClass ContactId, members only
  tier:       string | null,     // Membership tier, members only
  email:      string,
  name:       string,
  iat, exp, iss: "auth.sdfwa.org"
}
```

The JWT is set as a cookie scoped to `Domain=.sdfwa.org; Secure; HttpOnly; SameSite=Lax` so that every app on a `*.sdfwa.org` subdomain (including the WordPress site) receives it automatically. Public keys are exposed at `auth.sdfwa.org/api/auth/jwks` so consumers verify statelessly without calling back to the auth server on every request. Short access-token lifetime (~15 min) with silent refresh against `auth.sdfwa.org` when the user is active.

### Consumers
- **Other Next.js apps in this monorepo** (`diw`, `shop-ops`, future apps) consume auth via a new shared workspace package `@sdfwa/auth-client` containing:
  - JWKS-based JWT verification helpers (server-side middleware + `getSession()` analogue).
  - React hooks/components (`useSession`, `<RequireMember>`, `<RequireVolunteer tier="...">`).
  - A typed `Session` shape derived from the JWT claims.
  - A thin fetch wrapper around the auth app's public API (see below) for richer user data than what's encoded in the JWT.
  Each app drops its own Better-Auth instance and instead imports from `@sdfwa/auth-client`. Login redirects send users to `auth.sdfwa.org/login?redirect=<origin>` and the auth app bounces them back after setting the cookie.
- **WordPress (members-only section)** consumes the same JWT cookie via a small PHP plugin that verifies the token against the JWKS endpoint and maps the `kind` + `tier` claims onto WordPress roles/capabilities. Unauthenticated requests redirect to `auth.sdfwa.org/login?redirect=<wp-url>`.

### Public API (cross-app user data)
To keep the JWT small and avoid forcing every consumer to read the auth database directly, the auth app exposes a small REST API under `auth.sdfwa.org/api/` authenticated by the JWT cookie (or `Authorization: Bearer <jwt>` for server-to-server). CORS allows `*.sdfwa.org` origins with credentials.

- `GET /api/user` — Returns the full user object for the JWT bearer: identity, contact info, membership tier + start date, address, phone (members), or Google profile (volunteers). This is the canonical "read user" endpoint for downstream apps.
- `GET /api/user/:memberId` — Server-to-server lookup by Member ID, gated by a service token (for things like the diw fair-registration backend joining roles to members). Not callable from the browser.
- `GET /api/session` — Lightweight check returning just `{ kind, sub, tier, exp }` for cheap auth gates.
- `POST /api/sign-out` — Clears the JWT + device cookies on `.sdfwa.org`.

Responses are typed and the types are re-exported from `@sdfwa/auth-client` so consuming apps get end-to-end type safety without sharing the database schema.

### Transactional Email (magic links)
Magic-link emails (and any future auth-related mail) are sent through **Resend**, plugged into Better-Auth's `sendEmail` hook with React Email templates. Rationale:

- Best DX for the Next.js + React stack; templates live in `apps/auth/emails/`.
- Strong deliverability out of the box vs. self-hosting on Hetzner, where port 25 is blocked by default and IP reputation requires ongoing maintenance.
- Better-Auth abstracts the transport, so swapping to Postmark / SES later is a one-file change.

Self-hosting Postfix on the Dokploy box was considered and rejected — a magic link that lands in spam is a broken login, and the operational cost (DKIM rotation, bounce handling, blocklist monitoring) isn't worth saving ~$20/mo. Env vars: `RESEND_API_KEY`, `EMAIL_FROM` (e.g., `auth@sdfwa.org`).

### Shared Packages Added
- `@sdfwa/auth-client` — JWT verification, React hooks, session typings (consumed by all apps).
- `@sdfwa/auth-schema` *(optional)* — Drizzle table definitions for `members`/`volunteers` if any other app needs to read the synced member data directly; otherwise members are only reachable via the auth app's API.

### ProClass ETL Placement
The hourly ETL job (detailed below) is colocated with the auth app under `apps/auth/scripts/` (or `apps/auth/app/api/cron/proclass-sync/`) since the `members` table is owned by this service. Triggered by a scheduled job in the deployment platform; idempotent upserts keyed on `memberId`.

### Local Development
Runs on port `3002` (diw = 3000, shop-ops = 3001). Reuses the existing `docker compose` Postgres instance with a separate database `auth`. Required env vars: `DATABASE_CONNECTION_STRING`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_BASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `JWT_SIGNING_KEY` (or let Better-Auth's `jwt` plugin manage keys in DB), `PROCLASS_API_TOKEN`, `COOKIE_DOMAIN` (`.sdfwa.org` in prod, `localhost` in dev).

## ProClass ETL
ProClass is the record of truth containing contact information and membership status. We need to create a cron function that, on an hourly basis, scrapes ProClass for all contacts and their relevant membership statuses and other details to be extracted out and saved in our database for auth purposes.

We want to store the following in our Postgres database:
| Field 								| Data Type | Sourcing |
|-----------------------|-----------|----------|
| Member ID 						|	Number		| { ProClass Contact > ContactId } |
| Email									|	VarChar		| { ProClass Contact > Email } |
| Phone									|	VarChar		| { ProClass Contact > Mobile | HomePhone | WorkPhone } |
| First Name						|	VarChar		|	{ ProClass Contact > FirstName } |
| Last Name							|	VarChar		| { ProClass Contact > LastName } |
| Address								|	VarChar		| { ProClass Contact > find(Addresses, ({ IsPrimary }) => isPrimary === true) > StreetAddress1 + StreetAddress2 + City + State.Abbreviation + PostalCode } |
| Membership Tier				|	VarChar		| { ProClass Contact > getFirstAccountId(contact) > ProClass Memberships by AccountId > MembershipType } |
| Member Since (date)		|	DateTime	| { ProClass Contact > getFirstAccountId(contact) > ProClass Memberships by AccountId > getOldestMembership(results) > CreateDate } |

### The ETL Workflow
1. Get all contacts
	```bash
	# Warning: this is a very slow network call. Expect this to potentially take up to a minute or more
	curl --request GET \
		--url 'https://api130.imperisoft.com/api/Contacts' \
		--header 'authorization: Basic xxx'
	```
2. For each contact, obtain the AccountId and perform a parallelized lookup for memberships (15 AccountIds per query, no more than 50 queries in 10 seconds)
	```bash
	curl --request GET \
		--url 'https://api130.imperisoft.com/api/Memberships?$filter=AccountId eq 382646 or AccountId eq 367464 or AccountId eq 367465 or AccountId eq 392763 or AccountId eq 386104 or AccountId eq 367466 or AccountId eq 367467 or AccountId eq 367468 or AccountId eq 367469 or AccountId eq 367470 or AccountId eq 367471 or AccountId eq 367472 or AccountId eq 367473 or AccountId eq 387166 or AccountId eq 367474' \
		--header 'authorization: Basic xxx'
	```
3. Create the final Member details by joining both datasets by AccountId. Primary key by Member ID (ProClass ContactId). Insert into database

## Better-Auth Details
<!-- TODO -->