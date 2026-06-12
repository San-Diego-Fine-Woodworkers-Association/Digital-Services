# Dokploy deployment

End-to-end checklist for taking the auth app from "works on my laptop" to
`https://auth.sdfwa.org`.

## Prereqs

- DNS for `sdfwa.org` you can edit.
- Dokploy host with the existing `diw` / `shop-ops` deployments.
- A Postgres cluster reachable from Dokploy.
- A `@sdfwa.org` Google Workspace account with Cloud Console Owner.
- A Resend account on a paid or free plan with a verified sending domain.

## 1. DNS

Add an A/AAAA record for `auth.sdfwa.org` pointing at the Dokploy host. TTL
to whatever your other apps use.

## 2. Postgres

Create the database:

```sql
CREATE DATABASE auth;
```

Apply migrations once. The simplest way is to run migrate against the prod
URL from a workstation with that URL temporarily set:

```bash
DATABASE_CONNECTION_STRING="postgres://…/auth" bun run db:migrate --filter=auth
```

Confirm the 10 tables (`user`, `session`, `account`, `verification`, `jwks`,
`proclass_users`, `volunteers`, `trusted_devices`, `magic_link_tokens`,
`sync_runs`) exist.

## 3. Dokploy application

Create a new Application:

| Field | Value |
| --- | --- |
| Source type | Docker registry |
| Image | `ghcr.io/<owner>/auth:latest` |
| Domain | `auth.sdfwa.org` with Let's Encrypt cert |
| Internal port | 3002 |

### Environment variables

Set all of these in Dokploy's env panel. Anything marked **secret** should
never be checked into git.

| Var | Value |
| --- | --- |
| `DATABASE_CONNECTION_STRING` (secret) | Prod Postgres URL pointing at the `auth` database |
| `BETTER_AUTH_SECRET` (secret) | 32+ random bytes — `openssl rand -base64 32`. **Don't reuse the dev value.** |
| `BETTER_AUTH_URL` | `https://auth.sdfwa.org` |
| `NEXT_PUBLIC_BASE_URL` | `https://auth.sdfwa.org` |
| `COOKIE_DOMAIN` | `.sdfwa.org` |
| `CRON_SECRET` (secret) | Random; only the Dokploy scheduled task needs it |
| `SERVICE_TOKEN` (secret) | Random; distribute to backend consumers that call `/api/user/[memberId]` |
| `POST_LOGIN_DEFAULT_REDIRECT` | `https://www.sdfwa.org` |
| `GOOGLE_CLIENT_ID` | From the prod OAuth client (see [google-oauth.md](google-oauth.md)) |
| `GOOGLE_CLIENT_SECRET` (secret) | Same |
| `GOOGLE_SERVICE_ACCOUNT_JSON_B64` (secret) | `base64 -w0` of the downloaded service-account JSON. See [workspace-groups.md](workspace-groups.md). |
| `GOOGLE_ADMIN_IMPERSONATION_SUBJECT` | Email of the Workspace user the service account impersonates when querying the Admin SDK, e.g. `digital-services@sdfwa.org`. |
| `PROCLASS_USERNAME` (secret) | Prod ProClass API user |
| `PROCLASS_PASSWORD` (secret) | Prod ProClass API password |
| `RESEND_API_KEY` (secret) | Production Resend API key (verified-domain key) |
| `EMAIL_FROM` | `no-reply@auth.sdfwa.org` |

`NODE_ENV` is set to `production` by the standalone Next runner; you don't
need to set it explicitly.

## 4. GitHub Actions secret

The workflow at `.github/workflows/deploy.yml` already handles the auth app
via its app matrix. The only thing missing is the application-id secret:

- Repo → Settings → Secrets and variables → Actions → New repository secret
- Name: `DOKPLOY_APPLICATION_ID_AUTH`
- Value: the Application ID Dokploy assigns to your new auth service.

The deploy workflow upper-cases the matrix entry (`auth → AUTH`) and looks
up `DOKPLOY_APPLICATION_ID_AUTH` automatically.

## 5. Google OAuth (prod client)

See [google-oauth.md](google-oauth.md) for the full Cloud Console walkthrough.
The redirect URI you need on the prod client is
`https://auth.sdfwa.org/api/auth/callback/google`.

## 6. Resend (sending domain)

- In Resend, add `sdfwa.org` (or `auth.sdfwa.org`) as a sending domain.
- Resend gives you DKIM / SPF / DMARC records to add at your DNS host.
- Wait for verification.
- Generate a production API key tied to that domain and set
  `RESEND_API_KEY` above.
- Set `EMAIL_FROM=no-reply@auth.sdfwa.org` (or whatever address you verified).

Verify by signing in as a member from a fresh browser. The magic-link email
should arrive within seconds.

## 7. Scheduled tasks (ProClass ETL)

In Dokploy, on the auth application, add a scheduled task:

| Field | Value |
| --- | --- |
| Schedule | `0 * * * *` (hourly) |
| Command | `curl -fsSL -X POST -H "Authorization: Bearer ${CRON_SECRET}" https://auth.sdfwa.org/api/cron/proclass-sync` |

After one hour, check `sync_runs` in the prod DB for `status='ok'`.

## 8. First deploy

Trigger the deploy workflow by merging `feature/auth-sso-app` to `main`.
GitHub Actions will:

1. Detect the auth app via `turbo build --filter='[HEAD^1]' --dry-run=json`.
2. Build via `Dockerfile.app.prod` with `APP_NAME=auth`.
3. Push `ghcr.io/<owner>/auth:latest` plus a sha and version tag.
4. POST to Dokploy `/api/application.deploy` with the application id.

## 9. Smoke test

| Step | Expected |
| --- | --- |
| `curl https://auth.sdfwa.org/api/auth/jwks` | One EdDSA key. |
| Visit `https://auth.sdfwa.org/login` | Login form. |
| Visit `https://auth.sdfwa.org/whoami` | Logged in details displayed, otherwise (not signed in). |
| Visit `https://auth.sdfwa.org/api/cron/proclass-sync` (no auth) | 401. |
| Member flow with a real ProClass member | Email arrives; original tab signs in via polling. |
| Volunteer flow with a real `@sdfwa.org` Google account | `kind: "volunteer"`, `volunteers` row inserted. |
| From `https://diw.sdfwa.org/whoami` | Renders signed-in user using the `.sdfwa.org` cookie. |
| After 1 hour, `SELECT … FROM sync_runs ORDER BY started_at DESC LIMIT 1` | `status='ok'`, reasonable counts. |

## Rollback

The workflow tags each image with the short sha. To roll back: re-tag a
previous image as `latest` in GHCR (or change Dokploy to pull a specific
sha tag) and trigger a redeploy.

Better-Auth's `jwks` table is independent of releases; rotating to a prior
image will not invalidate user JWTs.

## Common production issues

| Symptom | Likely cause |
| --- | --- |
| `/api/auth/sign-in/social` 500s with "missing clientId or clientSecret" | `GOOGLE_CLIENT_ID` / `_SECRET` not set in Dokploy. |
| Magic-link email never arrives | Resend domain unverified, or `EMAIL_FROM` uses a domain you haven't verified. |
| Volunteers can sign in but no `volunteers` row appears | Likely `databaseHooks.account.create.after` failed silently — check structured logs for `volunteers` insert errors. |
| Session cookie isn't sent to `diw.sdfwa.org` | `COOKIE_DOMAIN` is missing the leading dot, or is set to `auth.sdfwa.org`. Must be `.sdfwa.org`. |
| All members 401 after ETL run | `proclass_users.active` is all `false` — likely an upstream ProClass schema change made the run "deactivate everything." Look at `sync_runs.error_message` and the contact response shape. |
