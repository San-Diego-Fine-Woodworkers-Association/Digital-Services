# ProClass → GHL sync

Pushes each member's ProClass activity (classes taken, shop slots used, HOST
safety certification, membership tier, member-since date) into GoHighLevel
(GHL) as tags and one custom field, keyed by email. GHL's own contact record
is the durable store — there's no local table for activity history. The
only local per-member state is `ghl_contact_state`, a hash of what was last
sent, used to skip unchanged members. See
[apps/auth/CONTEXT.md](../CONTEXT.md) for the domain vocabulary (Program,
Class, Shop Slot, GHL tag format) and
[docs/proclass-sync.md](proclass-sync.md) for the hourly ETL this sync reads
`proclass_users` from.

## What it does

On each run:

1. Fetches ProClass `/api/Contacts`, `/api/Memberships`, `/api/ProgramList`,
   `/api/RegistrationList`, and the local `proclass_users` table, in
   parallel.
2. Filters out junk contacts/programs (`lib/ghl/filters.ts`) and joins
   registrations against Programs whose type is `Class`, `Shop Slot`
   (any subtype), or `Safety`.
3. Merges ProClass contacts that share an email (case-insensitive) into one
   member, since GHL is keyed by email. The merged member gets the union of
   all their accounts' registrations, and the name, membership, and Member
   Since of the contact with the highest tier (`lifetime` > `gold` >
   `silver` > `bronze` > an unrecognised membership > none).
4. For each member, computes the exact tag/field set via
   `buildGhlTagPlan` (`lib/ghl/tags.ts`).
5. In **backfill** mode, considers a member's entire registration history;
   in **lookback** mode, only registrations from the trailing 7 days.
   Membership tier and Member Since always come from the full
   `proclass_users` row regardless of mode — only which *registrations*
   feed activity tags is windowed.
6. Hashes each member's inputs (name, the registrations in scope,
   membership tier, Member Since). In **lookback** mode, a member whose hash
   matches their `ghl_contact_state` row is skipped without any GHL call
   and counted in `members_unchanged`. **Backfill** mode never skips. A
   real run saves the hash after a member is processed successfully, so a
   member that fails is retried on the next run. Dry runs read the hashes
   but never write them.
7. In **dry-run** mode (the default), never calls the GHL API — accumulates
   what it would have sent into the run's `dry_run_output` column instead.
   In a real run, calls `lib/ghl/client.ts` per member: upsert-by-email +
   incremental add-tag for anyone with something new to say, plus an
   incremental remove-tag for anyone whose ProClass membership has lapsed
   (`proclass_users.membership` is `null`) and still carries a stale tier
   tag in GHL. Each GHL call retries transient failures (429, 5xx, or a
   timeout) up to 3 times with backoff before giving up.
8. Each member is processed independently — one member's failure doesn't
   stop the run. It's logged, counted in `member_errors`, and the sync
   moves on to the next member.
9. Writes a `ghl_sync_runs` row with final counts and `status='ok'` (or
   `'error'` if something outside the per-member loop failed). An email to
   digital-services@sdfwa.org goes out via Resend on `status='error'`, and
   also whenever `member_errors > 0` even though the run otherwise
   completed.

## Running it

The route checks the bearer and params, starts the sync in the background,
and replies `202` straight away:

```jsonc
{ "status": "started", "mode": "lookback", "dryRun": true }
```

The run's results go only to its `ghl_sync_runs` row (see Observability
below) and the error email. The response never includes them.

`mode` and `dryRun` are both explicit request parameters. The sync never
looks at its own run history to decide anything — pick both consciously
every time:

```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
  "http://localhost:3002/api/cron/ghl-sync?mode=lookback&dryRun=true"
```

| Param | Values | Default | Notes |
| --- | --- | --- | --- |
| `mode` | `backfill` \| `lookback` | `lookback` | 400 on anything else. `backfill` scans full registration history. `lookback` only looks at the trailing 7 days and is what the scheduled task runs. |
| `dryRun` | `true` \| `false` | `true` | `dryRun=false` is required to actually call GHL. There is no GHL sandbox — dry-run a change before running it for real. |

In prod: `https://auth.sdfwa.org/api/cron/ghl-sync?...` with the prod
`CRON_SECRET`.

### Initial backfill

Before the scheduled daily task starts running, seed GHL with full history
once:

```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
  "https://auth.sdfwa.org/api/cron/ghl-sync?mode=backfill&dryRun=true"
```

Inspect the result (see Observability below), then run it again with
`dryRun=false` once the output looks right.

### Dokploy setup

See [dokploy-deployment.md § 7](dokploy-deployment.md) for the exact
scheduled-task entries: a daily `mode=lookback&dryRun=false` run, and a
weekly `prune-sync-runs` run.

## Observability

Every run leaves a `ghl_sync_runs` row:

```sql
SELECT started_at, mode, dry_run, status, members_scanned,
       contacts_upserted, tags_added, tags_removed, member_errors, members_unchanged,
       error_message
FROM ghl_sync_runs
ORDER BY started_at DESC
LIMIT 10;
```

`error_message` is only set for a whole-run failure (something outside the
per-member loop). `member_errors` counts individual members that failed —
each one's specific error is in the server logs
(`ghl-sync: failed for <email>: <message>`), not in this table.

For a dry run, the full per-member plan is in `dry_run_output`:

```sql
SELECT dry_run_output
FROM ghl_sync_runs
ORDER BY started_at DESC
LIMIT 1;
```

Each entry is `{email, tagsToAdd, tagsToRemove, memberSinceField}`.

`ghl_sync_runs` and `sync_runs` rows older than 90 days are deleted by
`lib/maintenance/prune-sync-runs.ts`, exposed at
`/api/cron/prune-sync-runs` (same `CRON_SECRET`-bearer pattern).

## Tag/field vocabulary

See [CONTEXT.md's GHL Tag Format](../CONTEXT.md#ghl-tag-format) for the
exact rules. In addition to the tags documented there:

- `membership tier: <tier>` — normalized via the same `deriveTier()` used
  for session claims (`lib/auth/entitlement.ts`), so every raw ProClass
  `MembershipType` variant for a level (e.g. `"Shop - Gold Current"`,
  `"Shop - Gold Grandfathered"`) collapses to one `gold` tag.
- `membership tier full: <raw membership string>` — the untouched raw
  ProClass `MembershipType`, alongside the normalized tag.
- `Member Since` — a GHL Date custom field, not a tag (supports
  date-range Smart List queries; a tag can't).

## Common failures

| Symptom | Cause |
| --- | --- |
| 401 on the cron route | `CRON_SECRET` mismatch or missing. |
| 400, `mode must be one of: backfill, lookback` | Typo'd `?mode=` value. |
| A real member missing an expected tag | Check `isJunkContact`/`isJunkProgram` in `lib/ghl/filters.ts` — a false positive there silently drops the member from the whole sync. |
| `tagsRemoved` is 0 in a dry run | Expected — resolving which tag to remove requires reading the contact's current GHL tags, which dry-run mode never does (it makes no GHL calls at all). Only a real run can remove tags. |
| `ghl_sync_runs` row stuck at `status='running'` | The container restarted (e.g. a deploy) mid-run. Re-run the same `mode`/`dryRun`; writes are idempotent. |
| A member's GHL contact was edited by hand and lookback doesn't fix it | Lookback skips members whose ProClass inputs haven't changed. Run `mode=backfill`, which re-sends everyone. |
| Tag logic in `lib/ghl/tags.ts` changed | Lookback won't re-send unchanged members, so run `mode=backfill` once after deploying. |
| Run takes far longer than a dry run | A real run makes live GHL HTTP calls sequentially, one member at a time, with retries on transient failures. Dry runs make none. |
| `status='ok'` but `member_errors > 0` | Some members failed after retries were exhausted. The run still completed for everyone else — check server logs for `ghl-sync: failed for <email>` to see which members and why, then re-run the same `mode`/`dryRun` to retry just the failures (writes are idempotent). |

## GHL response shapes

Upsert-by-email (`POST /contacts/upsert`):

```jsonc
{ "contact": { "id": "..." }, "new": false }
```

Contact search (`POST /contacts/search`):

```jsonc
{ "contacts": [ { "id": "...", "tags": ["..."] } ], "total": 1 }
```

Custom field creation (`POST /locations/{id}/customFields`) — note the
nesting:

```jsonc
{ "customField": { "id": "...", "name": "...", "dataType": "DATE" } }
```

`customFields` entries in an upsert merge per-field into the contact's
existing custom fields. `tags` in an upsert overwrites the whole tag array
instead — `lib/ghl/client.ts` never passes `tags` in an upsert for this
reason; tag changes always go through the incremental add-tag/remove-tag
endpoints.

## Reset (dev only)

```bash
docker exec ghl-proclass-wayfinder-map-db-1 psql -U admin -d auth \
  -c "TRUNCATE ghl_sync_runs, ghl_contact_state;"
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
  "http://localhost:3002/api/cron/ghl-sync?mode=backfill&dryRun=true"
```

(Adjust the container name if your local Postgres runs under a different
compose project.)
