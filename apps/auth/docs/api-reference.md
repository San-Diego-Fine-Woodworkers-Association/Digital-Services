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

Provided by Better-Auth. Returns the raw session object including the derived
`memberId`, `membership`, `groups`, and `claims`. Returns `null` (200)
when no session. Prefer [`/api/session`](#get-apisession) for consumer apps —
it's the documented, stable shape.

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

These endpoints are CORS-enabled for `*.sdfwa.org` origins. The Better-Auth
endpoints under `/api/auth/*` (including `sign-out`) are also CORS-enabled so
consumer apps can call them from the browser.

### `GET /api/session`

Cheap session summary for client hooks. Always 200.

```json
{
  "user": {
    "id": "...",
    "email": "...",
    "memberId": "..." | null,
    "membership": "..." | null,
    "groups": ["digital-services", ...],
    "claims": ["member", "tier:gold", ...]
  },
  "expiresAt": "<ISO>"
}
```

Authorize on `claims`, not on account origin — `kind` is not exposed. The claim
set is:

- `"volunteer"` — signed in via Google (staff).
- `"member"` + `"tier:<level>"` — holds an Active ProClass tier (i.e. paying).
  The level is one of `bronze | silver | gold | lifetime`, normalized from the
  raw `membership` string.
- `[]` — signed in with no entitlement: a ProClass contact with no Active tier
  (the upsell state). A signed-in user is **not** necessarily a `member`.

There is no scalar `tier` field — use `getTier(claims)` from
`@sdfwa/auth-client` for the typed value. `membership` retains the raw ProClass
string for display/debug. `groups` is always an array (`[]` when none). See the
identity model in [architecture.md](architecture.md#identity-model) and
[workspace-groups.md](workspace-groups.md).

Or `{ "user": null }` when signed out.

### `GET /api/user`

Signed-in user joined with the appropriate detail row. One flat shape;
discriminate on which detail object is non-null (`member` for ProClass
contacts, `volunteer` for Google staff). `kind` is not exposed.

```json
{
  "id": "...",
  "email": "...",
  "name": "...",
  "memberId": "..." | null,
  "groups": ["digital-services", ...],
  "claims": ["member", "tier:gold", ...],
  "member": { /* full proclass_users row, or null */ },
  "volunteer": { /* full volunteers row including its own `groups`, or null */ }
}
```

A ProClass contact populates `member` whether or not they hold a tier — so
`member !== null` identifies the contact, while `claims` say whether they're
entitled.

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

### `GET /api/users/search?q=...` (service-to-service)

Member search for admin tools in consumer apps that need a "find a member by
name / member ID / email" picker (e.g. diw's admin "Register a Member"
dialog).

- Required header: `Authorization: Bearer ${SERVICE_TOKEN}`.
- No CORS, no cookies. Don't expose this to browsers.
- Query param `q` (required, min 2 chars). Matches active `proclass_users`
  by first name, last name, full name, member ID prefix, or email substring
  (all case-insensitive).
- Returns up to 20 results.

```jsonc
// 200
{
  "results": [
    {
      "memberId": "537906",
      "name": "Alice Example",
      "email": "alice@example.com",
      "membership": "Bronze"
    }
  ]
}
```

| Status | Meaning |
| --- | --- |
| 200 | Always returned for valid requests, including no matches (`results: []`). |
| 401 | Missing or wrong bearer. |

### `GET /api/memberships/tiers` (service-to-service)

Normalized membership **tiers** across active members, for access-rule editors
that gate on colloquial tiers — Gold, Silver, Bronze, Lifetime — rather than the
raw ProClass strings (e.g. the WordPress gating plugin). Each tier carries the
raw `MembershipType` values that fold into it (diagnostics), and any active
membership that maps to no known tier is reported under `unmapped` so ProClass
taxonomy drift is visible. Tiers and raw types are ordered busiest-first.

- Required header: `Authorization: Bearer ${SERVICE_TOKEN}`.
- No CORS, no cookies. Don't expose this to browsers.
- "Active" means `proclass_users.active` (the contact is live in the ETL), not
  "paying." Contacts with a null `membership` are excluded, so the summed tier
  counts are smaller than the total active-contact count.

```jsonc
// 200
{
  "tiers": [
    {
      "tier": "silver",
      "count": 352,
      "rawTypes": [
        { "membership": "Shop - Silver Current", "count": 209 },
        { "membership": "Shop - Silver Grandfather", "count": 93 }
      ]
    }
  ],
  "unmapped": [
    { "membership": "Some New ProClass Type", "count": 3 }
  ]
}
```

| Status | Meaning |
| --- | --- |
| 200 | Tiers + unmapped breakdown (both possibly empty). |
| 401 | Missing or wrong bearer. |
| 500 | `SERVICE_TOKEN` not configured. |

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
