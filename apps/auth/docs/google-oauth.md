# Google OAuth setup

The volunteer flow lets any `@sdfwa.org` Google Workspace user sign in. This
doc walks through provisioning the OAuth client.

## What we rely on

- The `hd` (hosted-domain) claim in Google's ID token, checked by
  `mapProfileToUser` in `apps/auth/lib/auth.ts`. Any value other than
  `sdfwa.org` is rejected at the callback.
- The Workspace **Internal** user-type on the consent screen, which makes
  Google reject non-Workspace accounts before the OAuth flow even starts.
  These two layers together are belt + suspenders.

## One-time Google Cloud setup

1. Sign in to [console.cloud.google.com](https://console.cloud.google.com)
   with a `@sdfwa.org` Google Workspace account that owns or is an Owner on
   a project (e.g. "SDFWA SSO"). Create the project if needed.

2. **APIs & Services → OAuth consent screen**:
   - User type: **Internal**.
   - App name: "SDFWA Sign-In".
   - User support email: yours.
   - Developer contact: yours.
   - Scopes: `openid`, `email`, `profile`. Nothing else.

3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**.
   - Name: "SDFWA Auth (dev)" — make a separate "(prod)" client too.
   - **Authorized JavaScript origins**:
     - dev: `http://localhost:3002`
     - prod: `https://auth.sdfwa.org`
   - **Authorized redirect URIs**:
     - dev: `http://localhost:3002/api/auth/callback/google`
     - prod: `https://auth.sdfwa.org/api/auth/callback/google`

4. Copy the **Client ID** and **Client Secret** into the appropriate env.

   For local dev, in `apps/auth/.env`:

   ```ini
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   ```

   For prod, set the same names in Dokploy's env vars panel.

## Verify

After restarting the dev server:

```bash
curl -sS -X POST http://localhost:3002/api/auth/sign-in/social \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3002" \
  -d '{"provider":"google","callbackURL":"http://localhost:3002/debug"}'
```

You should get `{ "url": "https://accounts.google.com/o/oauth2/v2/auth?…", "redirect": true }`
with the right `client_id`, `redirect_uri`, and `scope=email+profile+openid`.

End-to-end test (browser, can't be curled):

1. Visit `/login`.
2. Enter `you@sdfwa.org`. The form should swap to a "Continue with Google"
   button (no Member ID input).
3. Click → Google consent → bounced back.
4. `/debug` should show `kind: "volunteer"`, a `volunteers` table row with
   your Google `sub`, and an `account` row with `provider_id: "google"`.

If a non-Workspace `@gmail.com` user tries:

- If consent screen is **Internal**, Google blocks them before issuing a code.
- If it's **External**, our `mapProfileToUser` throws and Better-Auth
  surfaces an error to the user.

## Workspace groups (volunteer entitlements)

The OAuth client above only handles sign-in. To also read each volunteer's
Google Groups for group-based access control, set up a separate **service
account with Domain-Wide Delegation** — no additional user-facing scopes are
added; the DWD flow is server-to-server. See
[workspace-groups.md](workspace-groups.md) for the walkthrough.

## Rotating the client secret

If the secret leaks: in the Credentials console, "Reset Secret" on the same
OAuth client. Update Dokploy. Existing user sessions are unaffected; only
new sign-ins use the secret.
