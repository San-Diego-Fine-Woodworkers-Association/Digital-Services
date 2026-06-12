# Architecture

```
       ┌──────────────────┐         ┌────────────────────────────┐
ProClass│ api130.imperisoft│◄────────┤ /api/cron/proclass-sync    │
       │ (Contacts / Memberships)   │ Hourly, gated by CRON_SECRET│
       └──────────────────┘         └────────────┬───────────────┘
                                                 │ upsert
                                                 ▼
                                      ┌──────────────────────┐
                                      │  proclass_users      │
                                      │  (mirror, soft-del)  │
                                      └──────────┬───────────┘
                                                 │ credentials check
                                                 ▼
  Browser  ──►  /api/auth/sign-in/member  ──►  memberLoginPlugin  ──►  trusted_devices
                                                 │
                                  not trusted ─►│─ generate token → magic_link_tokens
                                                 │  ► email (prod) / inline URL (dev)
                                                 │
                                  /api/auth/magic-link/confirm   ──► sets session cookie (Device B)
                                  /api/auth/magic-link/poll      ──► sets session cookie (Device A)

                            /api/auth/sign-in/social/google  ──► Better-Auth Google flow
                                                                  ├── rejects unless profile.hd === "sdfwa.org"
                                                                  └── on first sign-in: insert into volunteers

  Consumer app (diw, shop-ops, future apps)
      ├── reads session cookie (Domain=.sdfwa.org)
      ├── @sdfwa/auth-client → GET /api/session, /api/user
      └── (future) verifies JWT locally via /api/auth/jwks
```

## Identity model

A signed-in user lives in the Better-Auth `user` table with three SDFWA-specific
additional fields:

- `kind` — `"member"` or `"volunteer"`.
- `memberId` — only set for members; the ProClass `ContactId`.
- `membership` — only set for members; the current Active ProClass membership
  type (e.g. `"Bronze"`, `"Shop - Gold Current"`). Null if the contact has no
  Active membership row.

A volunteer also has a row in `volunteers` keyed by the Better-Auth user id,
with the Google `sub`. Members do **not** have a row in `volunteers`; their
detail comes from `proclass_users` joined by `memberId`. Accounts are never
auto-linked across the two flows even if the email matches.

### Workspace groups

Volunteers also carry a `groups: string[]` — the bare names of the `@sdfwa.org`
Google Groups they belong to (e.g. `"digital-services"`; the suffix is stripped at
the boundary). The auth app reads them from the Admin SDK on sign-in and
re-syncs lazily (≤10 min staleness) on subsequent session/JWT reads. Groups
ride on every `/api/session`, `/api/user`, and JWT payload, so consumer apps
gate features with `requireGroup` / `hasGroup` from `@sdfwa/auth-client`
without keeping their own role tables. See
[workspace-groups.md](workspace-groups.md).

## Member sign-in (magic-link device trust)

The first time a member signs in from a new browser, the plugin issues a
single-use magic link (15-minute TTL, hashed at rest) and returns a
`pollToken` to the original tab. When the user clicks the link in any
browser — usually their email client — that browser becomes trusted and signs
itself in immediately. The original tab is polling `/api/auth/magic-link/poll`
and, on seeing the row consumed, marks itself trusted too and sets its own
session cookie. The original tab transitions to "redirecting" without manual
action.

Trust expires 90 days after `issuedAt`. The TTL is enforced server-side on
every sign-in, not by cookie age.

A small in-memory sliding-window rate limiter caps sign-in attempts at
5/email and 20/IP per 15 minutes. Acceptable for one Dokploy instance; if we
scale out, promote to a `login_attempts` table.

## Volunteer sign-in (Google SSO)

The Google provider is gated by `mapProfileToUser`: any Google profile whose
hosted-domain claim (`hd`) is not `sdfwa.org` is rejected at the OAuth callback.
Workspace "Internal" mode in the Google consent screen enforces the same rule
upstream. A `databaseHooks.account.create.after` writes the volunteers row on
first sign-in, using the Google `sub` from the `account` row that Better-Auth
just persisted.

## JWT + JWKS

Better-Auth's `jwt` plugin publishes a JWKS at `/api/auth/jwks` (EdDSA key
pair persisted in the `jwks` table, rotated by Better-Auth on its own
schedule). `POST /api/auth/jwt-refresh` mints a short-lived (15 min by
default) JWT for the current session, with claims including `sub`, `email`,
`kind`, `memberId`, `membership`, `groups`. Consumer apps can verify the JWT locally
via `verifyJwt()` from `@sdfwa/auth-client` — no round-trip to the auth app
on the hot path.

The cookie-forwarding pattern (`/api/session`, `/api/user`) is still used
when a consumer needs the joined `proclass_users` row, which the JWT doesn't
carry.

## Revocation

`enforceActiveOrRevoke` runs inside `/api/session`, `/api/user`, and
`/api/auth/jwt-refresh`. It re-reads `proclass_users.active` for member
sessions and, if the row is false, deletes the Better-Auth session. The
worst-case window between a member being deactivated in ProClass and losing
access is one ETL cycle (default hourly) plus the next consumer-side
request.

For volunteers, the same hook re-syncs groups when the cached set is older
than 10 minutes, and revokes the session if the Admin SDK reports the user no
longer exists in Workspace (HTTP 404). Transient Admin API errors leave the
session intact. Group **removals** propagate within ~10 minutes; account
removals propagate within the same window.

## Cookies

All set with `Domain=COOKIE_DOMAIN`. In prod that is `.sdfwa.org`, so the
session cookie is sent to every consumer app on the same root domain.

- `better-auth.session_token` — Better-Auth's session cookie. HttpOnly, SameSite=Lax.
- `sdfwa_device_id` — Our long-lived device id (UUID + HMAC-SHA256 signature
  with `BETTER_AUTH_SECRET`). HttpOnly. Used to look up `trusted_devices`.

## Cross-origin reads

`middleware.ts` adds CORS headers to `/api/session` and `/api/user` for any
origin matching `*.sdfwa.org` (and `localhost` in dev). Off-domain origins
receive no `Access-Control-Allow-Origin` and are blocked by the browser.

## Database tables owned by this app

| Table | Owner | Notes |
| --- | --- | --- |
| `user`, `session`, `account`, `verification` | Better-Auth | Standard. |
| `jwks` | Better-Auth jwt plugin | EdDSA key pair. |
| `proclass_users` | ProClass ETL | Soft-deleted, never written from a sign-in path. |
| `volunteers` | Google SSO hook | One row per `@sdfwa.org` user. |
| `trusted_devices` | memberLoginPlugin | `(userId, deviceId)` composite key. |
| `magic_link_tokens` | memberLoginPlugin | 15-min TTL, hashed tokens. |
| `sync_runs` | ProClass ETL | Observability — status, counts, error. |
