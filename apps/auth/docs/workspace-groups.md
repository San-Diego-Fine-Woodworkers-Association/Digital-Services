# Workspace groups

Lets a Google Workspace admin grant a volunteer access to a feature or app by
adding them to a Google Group (e.g. `tech-admin@sdfwa.org`). The auth app reads
each volunteer's groups from the Admin SDK and stamps them onto the session
and the JWT, so consumer apps can gate features without their own role tables.

## How it works

```
Google sign-in
   │
   ▼
databaseHooks.account.create.after
   │  ── upsert volunteers row
   │  ── fetchUserGroups(email) via Admin SDK
   ▼
volunteers.groups + last_groups_sync_at  (Postgres text[])
   │
   ▼
customSession enriches every session payload with groups
   │
   ▼
GET /api/session  → groups in `user`
GET /api/user     → groups on volunteer + top-level
POST /api/auth/jwt-refresh → groups claim in JWT
   │
   ▼
@sdfwa/auth-client → requireGroup / hasGroup / useUser().groups
```

Sync runs in two places:

1. **On every Google sign-in** via the `account.create.after` hook (after the
   volunteer row upsert). A failure here never blocks sign-in — groups stay at
   the last-known value and the staleness re-sync below picks it up later.
2. **On-demand inside `enforceActiveOrRevoke`** (which runs on every public
   session/JWT read). If `last_groups_sync_at` is null or older than 10 minutes,
   it re-fetches before returning the session. If Workspace responds 404 (user
   no longer exists), the Better-Auth session is deleted and the user is signed
   out across the ecosystem on the next request.

Members get `groups: []`. Group-gated routes will reject members just like they
reject anonymous users.

### Allowlist

There is no curated allowlist. We accept every group whose email ends in
`@sdfwa.org` (case-insensitive). The OAuth consent screen is **Internal**, so
only Workspace users sign in; the suffix filter is defense-in-depth against
external groups Workspace might surface.

## Workspace admin setup

One-time. Requires a Workspace super-admin.

1. **GCP project**: in the same project as the OAuth client (e.g. "SDFWA SSO"),
   go to **IAM & Admin → Service Accounts → Create service account**.
   - Name: `auth-directory-reader`. No project roles.
2. **Domain-wide delegation**: open the new service account, **Show advanced
   settings**, copy the **Client ID** (a long numeric string).
3. **Workspace admin console** (admin.google.com):
   - **Security → Access and data control → API controls → Manage Domain Wide
     Delegation**.
   - **Add new**.
   - Paste the Client ID from step 2.
   - OAuth scopes: `https://www.googleapis.com/auth/admin.directory.group.readonly`
4. **Service account key**: back in GCP, on the service account, **Keys → Add
   key → Create new key → JSON**. Download.
5. **Impersonation subject**: pick a Workspace user the service account will
   impersonate when querying — must have permission to read the directory.
   `tech-admin@sdfwa.org` is fine. The user does not need to log in anywhere;
   they just need to exist and not be suspended.

## Env vars

| Var | Value |
| --- | --- |
| `GOOGLE_SERVICE_ACCOUNT_JSON_B64` (secret) | `base64 -w0 < service-account.json` |
| `GOOGLE_ADMIN_IMPERSONATION_SUBJECT` | e.g. `tech-admin@sdfwa.org` |

Both must be set for group sync to run. If either is missing, the admin client
logs `google_admin_config_missing` once and returns `{ status: "skipped" }`,
which means **sign-in still works but groups stay at the last-known value**.
Useful for local dev without service-account creds.

## Sync behavior summary

| Trigger | What happens |
| --- | --- |
| Volunteer Google sign-in | Sync; on success update `groups` + `last_groups_sync_at`. |
| Any `/api/session` or `/api/user` read | If `last_groups_sync_at` is null or > 10 min old, re-sync inline before returning. |
| Admin SDK 404 (user removed from Workspace) | Better-Auth session deleted, structured log `session_revoked_volunteer_not_in_workspace`. |
| Admin SDK 5xx or timeout | Session left intact, log `google_admin_groups_fetch_failed`; staleness retries on next request. |

Revocation lag for a user removed from a group:

- The next session read after their last sync hits the 10-min staleness check
  and re-syncs. So group removal propagates within ~10 minutes.
- A JWT minted via `/api/auth/jwt-refresh` is good until its `exp` (15 min by
  default). Consumer apps using local JWT verify see the new groups on the
  next refresh.

## Consuming groups in apps

```ts
import { requireGroup } from "@sdfwa/auth-client/server";

await requireGroup(cookieHeader, "tech-admin@sdfwa.org");
// or any-of:
await requireGroup(cookieHeader, ["tech-admin@sdfwa.org", "shop-managers@sdfwa.org"]);
```

Pure predicates for middleware / client checks:

```ts
import { hasGroup, hasAnyGroup, hasAllGroups } from "@sdfwa/auth-client";

if (!hasGroup(session.user.groups, "tech-admin@sdfwa.org")) return null;
```

Reference page: `apps/diw/app/whoami/admin-only/page.tsx`.

## Common failures

| Symptom | Cause |
| --- | --- |
| Log: `google_admin_config_missing` | One of the env vars is unset. |
| Log: `google_admin_token_exchange_failed` with `unauthorized_client` | DWD not authorized in Workspace admin console, or wrong scope listed there. |
| Log: `google_admin_token_exchange_failed` with `invalid_grant` | Impersonation subject is suspended or doesn't exist. |
| Volunteer signs in but `groups` is `[]` | Either DWD not set up yet, or the user is not in any `@sdfwa.org` group. Test with `/api/Contacts`-style direct call via the script in [verification](#verification). |
| `session_revoked_volunteer_not_in_workspace` for an active user | Impersonation subject lacks permission to read other users (rare — promote them or pick a different subject). |

## Verification

Local script (don't commit):

```ts
// apps/auth/scripts/test-admin.ts
import { fetchUserGroups } from "@/lib/google/admin-client";
console.log(await fetchUserGroups("you@sdfwa.org"));
```

```bash
cd apps/auth && bun run scripts/test-admin.ts
```

After deploy:

```bash
curl -s https://auth.sdfwa.org/api/session -H "Cookie: $COOKIE" | jq .user.groups
```

## Key rotation

If the service-account key leaks: in GCP, on the same service account, **Add
key** (new JSON), update `GOOGLE_SERVICE_ACCOUNT_JSON_B64` in Dokploy, redeploy,
then delete the compromised key. The DWD authorization is on the Client ID,
which is unchanged across key rotations.
