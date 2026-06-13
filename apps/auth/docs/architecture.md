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

A signed-in user lives in the Better-Auth `user` table with these SDFWA-specific
additional fields. **These are internal** — `kind` in particular is never
exposed to consumer apps:

- `kind` — `"member"` (authenticated via ProClass) or `"volunteer"`
  (authenticated via @sdfwa.org Google). This records *how someone signed in*,
  not what they're entitled to. Used internally to route detail lookups and
  revocation; **not emitted** in any public payload.
- `memberId` — only set for ProClass contacts; the ProClass `ContactId`.
- `membership` — only set for ProClass contacts; the current Active ProClass
  membership type (e.g. `"Bronze"`, `"Shop - Gold Current"`). Null if the
  contact has no Active membership row.

### Identity vs. entitlement (the public contract)

Consumer apps authorize on a single **claims** array, derived once by the auth
app (`lib/auth/entitlement.ts`) and exposed on the session, JWT, and
`/api/session`:

- `claims: string[]` — the canonical entitlement set:
  - `"volunteer"` — signed in via Google (staff).
  - `"member"` + `"tier:<level>"` — holds an Active ProClass tier. The level is
    normalized from the free-text `membership` string to one of
    `bronze | silver | gold | lifetime`.
  - `[]` — signed in but no entitlement: a ProClass contact with no Active tier.
    This is the **upsell state** (a known person you can prompt to renew).

There is no separate scalar `tier` field — it would duplicate the `tier:<level>`
claim. For the typed value (display / "which level"), use `getTier(claims)` from
`@sdfwa/auth-client`; to gate, use `hasAnyTier` / `hasAnyClaim`.

> **Authentication and entitlement are separate axes.** Being signed in (a valid
> session) does not imply the `member` claim. The `member` claim means "holds an
> Active ProClass tier" — i.e. paying — and in production it applies to a
> *minority* of signed-in ProClass contacts (most have a null `membership`).
> Gate "is this a known person?" on session presence; gate "is this a paying
> member / tier X?" on `claims`. Consumers must never re-derive entitlement from
> the raw `membership` string.

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
default) JWT for the current session, with a payload including `sub`, `email`,
`memberId`, `membership`, `groups`, and the `claims` array. Consumer apps can verify the JWT locally
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

`middleware.ts` adds CORS headers to `/api/session`, `/api/user`, and
`/api/auth/*` for any origin matching `*.sdfwa.org` (and `localhost` in dev).
The `/api/auth/*` paths need cross-origin headers so consumer apps can call
`sign-out` (and Better-Auth's own session helpers) from the browser. Off-domain
origins receive no `Access-Control-Allow-Origin` and are blocked by the
browser.

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
