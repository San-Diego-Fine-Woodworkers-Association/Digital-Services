# ProClass → GHL sync

Pushes each member's ProClass activity (classes taken, shop slots used, HOST
safety certification, membership tier, member-since date) into GoHighLevel
(GHL) as tags and one custom field, keyed by email. GHL's own contact record
is the durable store — there's no local table for activity history. See
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
3. For each remaining member, computes the exact tag/field set via
   `buildGhlTagPlan` (`lib/ghl/tags.ts`) — pure, no I/O, fully unit-tested.
4. In **backfill** mode, considers a member's entire registration history;
   in **lookback** mode, only registrations from the trailing 7 days.
   Membership tier and Member Since always come from the full
   `proclass_users` row regardless of mode — only which *registrations*
   feed activity tags is windowed.
5. In **dry-run** mode (the default), never calls the GHL API — accumulates
   what it would have sent into the run's `dry_run_output` column instead.
   In a real run, calls `lib/ghl/client.ts` per member: upsert-by-email +
   incremental add-tag for anyone with something new to say, plus an
   incremental remove-tag for anyone whose ProClass membership has lapsed
   (`proclass_users.membership` is `null`) and still carries a stale tier
   tag in GHL.
6. Writes a `ghl_sync_runs` row with final counts and `status='ok'` (or
   `'error'`, plus an email to digital-services@sdfwa.org via Resend).

## Running it

**Mode and dry-run are both explicit request parameters — the sync never
looks at its own run history to decide anything.** Always pick both
consciously:

```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
  "http://localhost:3002/api/cron/ghl-sync?mode=lookback&dryRun=true"
```

| Param | Values | Default | Notes |
| --- | --- | --- | --- |
| `mode` | `backfill` \| `lookback` | `lookback` | 400 on anything else. `backfill` scans full registration history; use for the first-ever run or after a correctness fix that changes tag output. `lookback` is the normal daily mode. |
| `dryRun` | `true` \| `false` | `true` | `dryRun=false` is required to actually call GHL. There is no GHL sandbox — always dry-run a change before running it for real. |

In prod: `https://auth.sdfwa.org/api/cron/ghl-sync?...` with the prod
`CRON_SECRET`.

**There is no automatic backfill detection.** If you need a full-history
run (new tag category shipped, a bug fixed that changed prior output,
etc.), just pass `mode=backfill` explicitly — nothing to reset first.

## Observability

Every run leaves a `ghl_sync_runs` row:

```sql
SELECT started_at, mode, dry_run, status, members_scanned,
       contacts_upserted, tags_added, tags_removed, error_message
FROM ghl_sync_runs
ORDER BY started_at DESC
LIMIT 10;
```

For a dry run, the full per-member plan is in `dry_run_output`:

```sql
SELECT dry_run_output
FROM ghl_sync_runs
ORDER BY started_at DESC
LIMIT 1;
```

Each entry is `{email, tagsToAdd, tagsToRemove, memberSinceField}`.

`ghl_sync_runs` (and `sync_runs`) rows older than 90 days are deleted by
`lib/maintenance/prune-sync-runs.ts`, exposed at
`/api/cron/prune-sync-runs` (same `CRON_SECRET`-bearer pattern) — **not yet
on a Dokploy schedule**, trigger it manually until that's wired up.

## Tag/field vocabulary

See [CONTEXT.md's GHL Tag Format](../CONTEXT.md#ghl-tag-format) for the
exact rules. In addition to the tags documented there:

- `membership tier: <tier>` — normalized via the same `deriveTier()` used
  for session claims (`lib/auth/entitlement.ts`), so `"Shop - Gold
  Current"`, `"Shop - Gold Grandfathered"`, etc. all collapse to one
  `gold` tag.
- `membership tier full: <raw membership string>` — the untouched raw
  ProClass `MembershipType`, alongside the normalized tag, for anyone who
  needs the status/price detail the normalizer drops.
- `Member Since` — a GHL Date custom field, not a tag (supports
  date-range Smart List queries; a tag couldn't).

## Common failures

| Symptom | Cause |
| --- | --- |
| 401 on the cron route | `CRON_SECRET` mismatch or missing. |
| 400, `mode must be one of: backfill, lookback` | Typo'd `?mode=` value. |
| A real member missing an expected tag | Check `isJunkContact`/`isJunkProgram` (`lib/ghl/filters.ts`) — a false positive there silently drops the member. Confirmed once already: a null `CreateDate` on the ProClass Contact used to be (wrongly) treated as junk on its own; see SDF-61's history for how that was diagnosed. |
| `tagsRemoved` always 0 in dry runs | Expected — resolving which tag to remove requires reading the contact's *current* GHL tags, which dry-run mode can't do (it never calls GHL at all). Only visible in a real run. |
| A `Program.Title`-derived tag looks wrong | `Title` is nullable in live ProClass data; `lib/proclass/transform.ts`'s `programTitle()` falls back to `Description`. A handful of legacy programs (e.g. some historical HOST safety-test records) only carry the right name in `ShortDescription`, which nothing reads — a known, accepted gap, not a bug. |
| Run takes far longer than a dry run | A real run makes live GHL HTTP calls sequentially, one member at a time — expect this to dominate wall-clock time, unlike a dry run (no network calls at all). |

## GHL response shapes we depend on

Upsert-by-email (`POST /contacts/upsert`) response:

```jsonc
{ "contact": { "id": "..." }, "new": false }
```

Contact search (`POST /contacts/search`):

```jsonc
{ "contacts": [ { "id": "...", "tags": ["..."] } ], "total": 1 }
```

Custom field creation (`POST /locations/{id}/customFields`) — note the
nesting, easy to get wrong (we did, once):

```jsonc
{ "customField": { "id": "...", "name": "...", "dataType": "DATE" } }
```

`customFields` entries in an upsert **merge per-field** — confirmed live
against a real contact with pre-existing unrelated custom fields and tags,
none of which were touched. This is the opposite of `tags`, which
overwrites the whole array; `lib/ghl/client.ts` never passes `tags` in an
upsert for exactly this reason.

## Reset (dev only)

```bash
docker exec ghl-proclass-wayfinder-map-db-1 psql -U admin -d auth \
  -c "TRUNCATE ghl_sync_runs;"
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
  "http://localhost:3002/api/cron/ghl-sync?mode=backfill&dryRun=true"
```

(Adjust the container name if your local Postgres runs under a different
compose project.)
