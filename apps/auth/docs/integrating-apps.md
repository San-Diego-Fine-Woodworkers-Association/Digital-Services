# Integrating a consumer app

A "consumer app" is anything inside the monorepo (or any service deployed
under `*.sdfwa.org`) that needs to know who the signed-in user is. Examples:
`diw`, `shop-ops`, the WordPress site (eventually).

The package `@sdfwa/auth-client` is the supported way in.

## Add the dependency

```jsonc
// apps/<your-app>/package.json
{
  "dependencies": {
    "@sdfwa/auth-client": "workspace:*"
  }
}
```

Then `bun install` at the repo root.

## Configure env

You need two server-side env vars: one for the auth app (so the consumer
knows where to send the user / fetch sessions) and one for the consumer
app's own origin (so it can build absolute `redirect=` URLs back to itself
after sign-in).

```ini
# apps/<your-app>/.env
AUTH_BASE_URL=http://localhost:3002    # auth app
APP_BASE_URL=http://localhost:3000     # this app's own origin
```

In production these become `https://auth.sdfwa.org` and (e.g.)
`https://diw.sdfwa.org`. Add both to the app's `turbo.json` `build.env`
so cache keys invalidate on change.

> **Why no `NEXT_PUBLIC_*`?** Those would be inlined into the client bundle
> at build time, which couples one Docker image to one set of URLs and
> double-declares every value. Instead, read these on the server and pass
> them down — see [Wire the client hooks](#wire-the-client-hooks) and the
> sign-in/out sections below.

If the consumer also calls the service-to-service endpoints
(`/api/user/[memberId]`, `/api/users/search`), add `AUTH_SERVICE_TOKEN` as
well — see [Server-to-server lookups](#server-to-server-lookups-no-user-context).

## Server-side: read the session

```ts
import { cookies } from "next/headers";
import { getServerSession, getCurrentUser } from "@sdfwa/auth-client/server";

export default async function Page() {
  const cookieHeader = (await cookies())
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const session = await getServerSession(cookieHeader);
  const user = session ? await getCurrentUser(cookieHeader) : null;

  if (!session) return <SignInPrompt />;
  return <YourPage user={user} />;
}
```

Both helpers forward the browser's cookies to the auth app, which validates
the session and (for `getCurrentUser`) returns the joined `proclass_users`
or `volunteers` row.

Helpers that throw on the wrong identity:

```ts
import { requireMember, requireVolunteer } from "@sdfwa/auth-client/server";

await requireMember(cookieHeader);    // throws "Unauthorized" or "Forbidden"
await requireVolunteer(cookieHeader);
```

## Gating on Workspace groups

Volunteers carry a `groups: string[]` array of bare `@sdfwa.org` Google Group
names (the `@sdfwa.org` suffix is stripped — see `docs/workspace-groups.md`).
Use `requireGroup` for server-side route protection:

```ts
import { requireGroup } from "@sdfwa/auth-client/server";

await requireGroup(cookieHeader, "digital-services");
// or any-of:
await requireGroup(cookieHeader, ["digital-services", "shop-managers"]);
```

For middleware or client-side checks (no fetch), use the pure predicates from
the main entry point:

```ts
import { hasGroup, hasAnyGroup, hasAllGroups } from "@sdfwa/auth-client";

if (!hasGroup(session.user.groups, "digital-services")) return null;
```

All predicates are default-closed: empty `userGroups` or empty
`allowed`/`required` returns false. Comparisons are case-sensitive — compare
against lowercase constants. The canonical admin group for digital services
work (used by diw's admin pages and the auth app's own `/whoami/admin-only`)
is `"digital-services"`. For the Workspace admin setup, see
`docs/workspace-groups.md` in the auth app.

## Client-side: hooks

### Wire the client hooks

The `useSession` / `useUser` hooks need to know the auth app's base URL at
request time. Supply it via `AuthBaseUrlProvider` from a root-level Server
Component, sourcing the value from your server-side `AUTH_BASE_URL` env:

```tsx
// app/providers.tsx — "use client" wrapper for everything below
"use client";
import { AuthBaseUrlProvider } from "@sdfwa/auth-client/client";

export function Providers({
  authBaseUrl,
  children,
}: {
  authBaseUrl: string;
  children: React.ReactNode;
}) {
  return (
    <AuthBaseUrlProvider value={authBaseUrl}>
      {children}
    </AuthBaseUrlProvider>
  );
}

// app/layout.tsx — Server Component reads env, passes value in
import { Providers } from "@/components/providers";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers authBaseUrl={process.env.AUTH_BASE_URL!}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

### Use the hooks

```tsx
"use client";
import { useSession, useUser } from "@sdfwa/auth-client/client";

export function NavUser() {
  const session = useSession();
  if (session.status === "loading") return null;
  if (session.status === "unauthenticated") return <SignInLink />;
  return <span>{session.data.user.email}</span>;
}
```

Both hooks `fetch` with `credentials: "include"` so the browser sends the
`.sdfwa.org` cookie. The auth app's CORS middleware allows any subdomain.

If no `AuthBaseUrlProvider` wraps the tree, the hooks fall back to
`process.env.NEXT_PUBLIC_AUTH_BASE_URL` (if you defined one at build time)
and finally to `https://auth.sdfwa.org`. The Provider is the recommended
path because it's runtime-resolved.

## (Future) Local JWT verification

When you need to authorize lots of server-side requests without round-tripping
to the auth app, mint a JWT once and verify locally:

```ts
import { verifyJwt } from "@sdfwa/auth-client";

const payload = await verifyJwt(token, { authBaseUrl: process.env.AUTH_BASE_URL });
// { sub, email, kind, memberId, membership, exp, iss, aud }
```

`verifyJwt` fetches and caches the JWKS for one hour. To get a token in the
first place, the consumer app calls `POST /api/auth/jwt-refresh` with the
session cookie. This path is implemented but currently optional — the
cookie-forwarding helpers above are fine for SSR.

## Sign-in entry point

Send unauthenticated users to `https://auth.sdfwa.org/login?redirect=<encoded>`.
The auth app validates the `redirect` param: it must be a URL whose host is
`sdfwa.org`, ends in `.sdfwa.org`, or is `localhost`.

**Use an absolute URL.** A relative path like `/fair-registration` *will*
pass validation, but the auth app resolves it against its own origin, so the
user lands on `auth.sdfwa.org/fair-registration` after sign-in instead of
your app. Build the redirect using your own `APP_BASE_URL`:

```ts
// Server Component or server action
const redirectTo = `${process.env.APP_BASE_URL}/fair-registration`;
redirect(
  `${process.env.AUTH_BASE_URL}/login?redirect=${encodeURIComponent(redirectTo)}`,
);
```

For client components that need these URLs, the recommended pattern is a
runtime-config Provider: read env once in your root layout (Server
Component), drop the values into a React context, and consume from any
descendant client component via a `useAppConfig()` (or similarly-named)
hook. See `apps/diw/lib/app-config.tsx` for the reference shape. This
avoids both prop-drilling and `NEXT_PUBLIC_*` baking, and gives you one
home for any future runtime config (feature flags, observability keys, etc).
For the "return to current page" case, prefer
`window.location.origin + window.location.pathname` at click time, falling
back to `useAppConfig().appBaseUrl` for SSR.

If you omit `redirect` entirely, users land on `POST_LOGIN_DEFAULT_REDIRECT`
(in prod, `https://www.sdfwa.org`).

## Sign-out

POST to `https://auth.sdfwa.org/api/auth/sign-out` with
`Content-Type: application/json`. Don't form-POST — Better-Auth rejects
that. Pass the auth base URL down as a prop from a server parent rather
than reading `process.env` in the browser:

```ts
// client component, receives `authBaseUrl` from server-rendered parent
await fetch(`${authBaseUrl}/api/auth/sign-out`, {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: "{}",
});
```

**Follow it with a hard navigation, not `router.push`/`router.refresh`.**
The `useSession` / `useUser` hooks only fetch on mount, so a client-side
navigation will keep the stale `authenticated` state until something forces
a remount — the UI will look signed-in even though the cookie is gone:

```ts
await fetch(/* sign-out as above */);
window.location.assign("/"); // or wherever your signed-out landing is
```

A `router.refresh()` re-runs server components so the SSR-rendered shell
flips to signed-out, but any client component reading `useSession()` retains
the stale data. The hard nav is the standard sign-out UX anyway.

## Server-to-server lookups (no user context)

Two service-token-protected endpoints are available for admin tools and
background jobs that need member data without a browser session.

**Point lookup** — when you already have a memberId (e.g. the result of an
admin picking a member, or a job hydrating ProClass-derived data):

```ts
const res = await fetch(`${process.env.AUTH_BASE_URL}/api/user/${memberId}`, {
  headers: { Authorization: `Bearer ${process.env.AUTH_SERVICE_TOKEN}` },
  cache: "no-store",
});
// 200 → full proclass_users row, 404 → not found
```

**Search** — for "find a member" pickers. Matches active `proclass_users` by
first name, last name, full name, member ID prefix, or email substring
(case-insensitive); returns up to 20 results:

```ts
const res = await fetch(
  `${process.env.AUTH_BASE_URL}/api/users/search?q=${encodeURIComponent(query)}`,
  {
    headers: { Authorization: `Bearer ${process.env.AUTH_SERVICE_TOKEN}` },
    cache: "no-store",
  },
);
const { results } = await res.json();
// results: { memberId, name, email, membership }[]
```

Provision the token by setting `SERVICE_TOKEN` in the auth app's prod env,
then distribute the same value to every backend caller as
`AUTH_SERVICE_TOKEN`. Browsers should **not** have this token — neither
endpoint sets CORS headers, and the token bypasses session checks entirely.
Always call these from `"use server"` actions or route handlers, never from
client code.

## Reference implementation

The smallest, most realistic example is diw's auth wrapper at
`apps/diw/lib/auth/session.ts` — a thin helper that bundles the
cookie-forwarding boilerplate plus a `loginUrl()` builder for absolute
redirects. The pages that consume it (`apps/diw/app/fair-registration/*` for
member flows; `apps/diw/app/fair-registration/admin/*` for group-gated
admin) show the full pattern end-to-end, including the admin
"Register a Member" search powered by `/api/users/search`.

For just inspecting the session shape, the auth app's own
`apps/auth/app/whoami/page.tsx` is the simplest demo.
