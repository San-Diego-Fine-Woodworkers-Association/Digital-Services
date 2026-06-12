# API reference

All endpoints are served from `https://auth.sdfwa.org` (or `localhost:3002`
in dev). Better-Auth's own routes are mounted under `/api/auth/*` via the
catch-all handler.

## Sign-in & session lifecycle

### `POST /api/auth/sign-in/member`

Member credentials login. Returns one of three shapes:

```json
{ "status": "trusted", "user": { ... }, "session": { ... } }
```
Trusted device; session cookie set, ready to redirect.

```json
{
  "status": "magic_link_pending",
  "pollToken": "<base64url>",
  "expiresAt": "<ISO>",
  "devMagicLinkUrl": "<url, dev only>"
}
```
Email sent (prod) or URL returned inline (dev). The original tab should poll
`/api/auth/magic-link/poll` until ready. No session cookie yet.

| Status | Meaning |
| --- | --- |
| 200 | One of the success shapes above. |
| 400 | Missing email or memberId. |
| 401 | No matching active member. |
| 429 | Rate-limited (5/email or 20/IP per 15 min). |

Body:

```json
{ "email": "alice@example.com", "memberId": "537906" }
```

### `GET /api/auth/magic-link/confirm?token=<token>`

The URL that lands in the email. Confirms the link, marks the confirming
device trusted, and sets a session cookie on that device. Renders a small
"You're signed in" HTML page.

| Status | Meaning |
| --- | --- |
| 200 | Confirmed; session cookie set. |
| 400 | Missing/invalid/expired/already-used token. |

### `POST /api/auth/magic-link/poll`

The original tab polls here every ~2 seconds until ready.

Body: `{ "pollToken": "..." }`

| Response | Meaning |
| --- | --- |
| `{ "status": "pending" }` | Link not yet clicked. |
| `{ "status": "ready" }` | Link consumed; this device is now trusted and the response set a session cookie. |
| `{ "status": "expired" }` | TTL elapsed before confirmation. |
| `404` | Unknown poll token. |

### `POST /api/auth/sign-in/social`

Provided by Better-Auth. Body: `{ "provider": "google", "callbackURL": "..." }`.
Returns `{ url, redirect: true }` — the caller (login form) navigates to the
URL. Non-`@sdfwa.org` accounts are rejected at the OAuth callback and a
generic error is shown.

### `POST /api/auth/sign-out`

Provided by Better-Auth. Requires `Content-Type: application/json`. Clears
the session cookie. Does **not** clear the device cookie.

### `GET /api/auth/get-session`

Provided by Better-Auth. Returns the raw session object including additional
fields (`kind`, `memberId`, `membership`). Returns `null` (200) when no
session.

### `POST /api/auth/jwt-refresh`

Trades the current session cookie for a fresh short-lived EdDSA JWT.
Re-runs `enforceActiveOrRevoke` first, so a deactivated member is signed
out instead of re-issued a JWT.

```json
{ "token": "<jwt>" }
```

| Status | Meaning |
| --- | --- |
| 200 | Token minted. |
| 401 | No session, or member is deactivated. |
| 500 | Better-Auth failed to mint. |

## Public read API

These endpoints are CORS-enabled for `*.sdfwa.org` origins.

### `GET /api/session`

Cheap session summary for client hooks. Always 200.

```json
{
  "user": {
    "id": "...",
    "email": "...",
    "kind": "member" | "volunteer" | null,
    "memberId": "..." | null,
    "membership": "..." | null,
    "groups": ["digital-services", ...]
  },
  "expiresAt": "<ISO>"
}
```

`groups` is always an array — `[]` for members, anonymous, and volunteers
without group memberships. See [workspace-groups.md](workspace-groups.md).

Or `{ "user": null }` when signed out.

### `GET /api/user`

Signed-in user joined with the appropriate detail row.

For members:

```json
{
  "kind": "member",
  "id": "...",
  "email": "...",
  "name": "...",
  "memberId": "...",
  "member": { /* full proclass_users row, or null */ }
}
```

For volunteers:

```json
{
  "kind": "volunteer",
  "id": "...",
  "email": "...",
  "name": "...",
  "groups": ["digital-services", ...],
  "volunteer": { /* full volunteers row including its own `groups`, or null */ }
}
```

| Status | Meaning |
| --- | --- |
| 200 | Signed in. |
| 401 | No session, or member just got soft-deleted. |

### `GET /api/user/[memberId]` (service-to-service)

Member lookup for backend callers that have no user context — e.g. a worker
hydrating ProClass-derived data into another app's database.

- Required header: `Authorization: Bearer ${SERVICE_TOKEN}`.
- No CORS, no cookies. Don't expose this to browsers.
- Returns the full `proclass_users` row or 404.

### `GET /api/auth/jwks`

The JWKS document. EdDSA key(s). Cached upstream by `@sdfwa/auth-client`'s
`verifyJwt` for 1 hour.

## Cron

### `POST /api/cron/proclass-sync`

Internal hourly ETL. Header: `Authorization: Bearer ${CRON_SECRET}`. See
[proclass-sync.md](proclass-sync.md) for the response shape and the
underlying behavior.

| Status | Meaning |
| --- | --- |
| 200 | `sync_runs` row created with status `ok`. |
| 401 | Missing or wrong bearer. |
| 500 | ETL failed; `sync_runs` row records the error message. |
