# ProClass ETL

A scheduled job that mirrors every ProClass contact and their primary
account's memberships into the local `proclass_users` table. This table is
the source of truth for member sign-in, so the ETL needs to be healthy.

## What it does

On each run:

1. Inserts a `sync_runs` row with `status='running'`.
2. `GET /api/Contacts` — pulls every contact in ProClass (1+ minute call).
3. Derives the **primary** `AccountId` from each contact's
   `ContactAccounts[].IsPrimary`.
4. Batches account IDs into 15-id `$filter=AccountId eq 1 or AccountId eq 2 …`
   queries against `/api/Memberships`, paced under ProClass's 50-per-10s limit.
5. Joins by account id, picks the **current Active** membership for
   `proclass_users.membership` and the **oldest** membership's `CreateDate`
   for `proclass_users.member_since`.
6. Upserts every contact (with an email) keyed on `member_id`, setting
   `active=true` and bumping `last_synced_at`.
7. **Soft-deactivates** every existing `proclass_users` row whose member_id
   was not present in this run — sets `active=false`.
8. Updates the `sync_runs` row with final counts and `status='ok'`.

If anything throws, the catch block writes `status='error'` with the
message and the route handler returns 500.

## Why soft-delete matters

The `active` flag is load-bearing for security. `enforceActiveOrRevoke`
re-reads it on every public-API request; a member whose ProClass record has
gone away is signed out within one ETL cycle plus the next request.

## Scheduling

In prod, a Dokploy scheduled task POSTs to `/api/cron/proclass-sync` hourly
with the `CRON_SECRET` bearer. See
[dokploy-deployment.md](dokploy-deployment.md#scheduled-tasks).

In dev, trigger manually:

```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3002/api/cron/proclass-sync
```

## Observability

Every run leaves a `sync_runs` row:

| Column | Meaning |
| --- | --- |
| `started_at` / `finished_at` | Self-explanatory. |
| `status` | `running`, `ok`, `error`. |
| `contacts_scanned` | Count from `/api/Contacts`. |
| `members_upserted` | Rows written this run. |
| `members_deactivated` | Rows that were active but no longer present. |
| `error_message` | Populated on failure. |

Inspect with:

```sql
SELECT started_at, status, contacts_scanned, members_upserted,
       members_deactivated, error_message
FROM sync_runs
ORDER BY started_at DESC
LIMIT 10;
```

## ProClass response shapes we depend on

A contact:

```jsonc
{
  "ContactId": 123,
  "Email": "...",
  "FirstName": "...", "LastName": "...",
  "Mobile": "...", "HomePhone": "...", "WorkPhone": "...",
  "Addresses": [ { "IsPrimary": true, "StreetAddress1": ..., ... } ],
  "ContactAccounts": [ { "AccountId": 42, "IsPrimary": true } ]
}
```

A membership:

```jsonc
{
  "MembershipType": "Bronze",
  "MembershipStatus": "Active",
  "CreateDate": "2023-07-13T19:16:33.147",
  "AccountId": 42
}
```

If ProClass adds or renames fields, the transformations live in
`apps/auth/lib/proclass/transform.ts` and are covered by unit tests in
`apps/auth/__tests__/proclass-transform.test.ts`.

## Common failures

| Symptom | Cause |
| --- | --- |
| 401 on the cron route | `CRON_SECRET` mismatch or missing. |
| 500 / `errorMessage` includes "PROCLASS_USERNAME and PROCLASS_PASSWORD must be set" | Env vars not loaded. |
| `with_active_membership` is 0 but `total` is large | Likely a field-name change on the contact (`ContactAccounts` vs. older `Accounts`). Inspect `/api/Contacts?$filter=ContactId eq <id>` directly. |
| Run takes much longer than expected | ProClass rate limit. The client paces 50 queries / 10s; if they tighten, raise the `RATE_LIMIT_WINDOW_MS` constant. |

## Reset (dev only)

```bash
docker exec infrastructure-db-1 psql -U admin -d auth -c "TRUNCATE proclass_users, sync_runs;"
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3002/api/cron/proclass-sync
```
