# Project Specification: SDFWA Multi-Tenant Monorepo

## 1. Project Overview

**Goal:** Build a Turborepo-based monorepo for the San Diego Fine Woodworking Association (SDFWA).
**Core Logic:** Single Identity Provider (IdP) hosted at `auth.sdfwa.org` managing sessions across multiple subdomains using root-domain cookies.

### Domains & Apps

* **Auth (IdP):** `auth.sdfwa.org` (Login UI, API, DB Migrations, Stripe Webhooks).
* **Home:** `www.sdfwa.org`
* **Shop Use:** `shop.sdfwa.org`
* **Education:** `classes.sdfwa.org`
* **Design in Wood:** `diw.sdfwa.org`
* **Shop Ops:** `shopop.sdfwa.org` (Strict Volunteer access).

### Tech Stack

* **Framework:** Next.js 15 (App Router).
* **Monorepo:** Turborepo.
* **Database:** Postgres (Neon/Supabase/AWS RDS).
* **ORM:** Drizzle ORM.
* **Authentication:** Better Auth.
* **Language:** TypeScript.
* **CI/CD:** GitHub Actions
* **Hosting:** Dokploy on Hetzner

---

## 2. Architecture & File Structure

```text
/
├── apps/
│   ├── auth/              # The Identity Provider
│   │   ├── app/
│   │   │   ├── (auth)/signin/page.tsx
│   │   │   ├── api/auth/[...all]/route.ts  # Main Auth Endpoint
│   │   │   └── api/webhooks/stripe/route.ts
│   │   └── drizzle/       # Migrations live here
│   ├── www/               # Home
│   ├── shop/              # Shop Use
│   ├── classes/           # Education
│   └── shopop/            # Shop Operations
├── packages/
│   ├── db/                # Shared Drizzle Config & Schema
│   ├── auth-client/       # Shared Better Auth Configuration
│   ├── ui/                # Shared React Components
│   └── tsconfig/

```

---

## 3. Database Schema (`packages/db`)

We will use a unified schema. The `User` table holds the roles, but the `Account` table allows us to determine *how* they logged in.

**Required Tables (Postgres/Drizzle):**

```typescript
// packages/db/schema/auth.ts

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  image: text("image"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  // ROLES: Stored permanently here
  roles: text("roles").array().default(["member"]), 
  // MEMBER ID: Specific to SDFWA
  memberId: text("member_id"),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(), // The Cookie Value
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id),
  // CRITICAL: We need to know WHICH account created this session
  activeAccountId: text("active_account_id"), 
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  externalId: text("external_id").notNull(), // e.g. Google Sub ID
  accountType: text("account_type").notNull(), // "google" or "credential"
  userId: text("user_id").notNull().references(() => user.id),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  // ... other standard OIDC fields
});

```

---

## 4. Authentication Logic (`packages/auth-client`)

This package exports the `betterAuth` server instance and client hooks.

### Configuration Requirements:

1. **Root Domain Cookies:** Must be set to `.sdfwa.org` to share sessions across apps.
2. **Session Hook (The Access Logic):**
* If Provider is `credential` (Personal Email) -> **Grant Member Role ONLY**.
* If Provider is `google` (Volunteer Workspace) -> **Grant Volunteer AND Member Roles**.



### Implementation Spec (Server Config):

```typescript
// packages/auth-client/src/server.ts

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@repo/db"; 

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { ... }, // Map schema
  }),
  advanced: {
    cookie: {
      domain: ".sdfwa.org", // <--- ENABLES SUBDOMAIN SHARING
    },
  },
  plugins: [
     // Add necessary plugins like admin or bearer if needed
  ],
  callbacks: {
    async session({ session, user }) {
      // Fetch the specific account used for this session
      const activeAccount = await db.query.account.findFirst({
        where: eq(account.id, session.activeAccountId)
      });

      const provider = activeAccount?.accountType;
      const dbRoles = user.roles || [];

      // DYNAMIC ROLE FILTERING
      let sessionRoles = ["member"]; // Everyone is at least a member

      if (provider === "google") {
         // Only grant volunteer access if they logged in via Google
         // AND they actually have the role in the DB
         if (dbRoles.includes("volunteer")) {
            sessionRoles.push("volunteer");
         }
      }

      return {
        ...session,
        user: {
          ...session.user,
          roles: sessionRoles // Overwrite roles sent to frontend
        }
      };
    }
  }
});

```

---

## 5. App-Specific Implementation Rules

### A. The Auth App (`apps/auth`)

* **Responsibility:** The only app that processes `signIn`, `signUp`, and `linkAccount`.
* **API Routes:** Host the `api/auth/[...all]` route here.
* **Webhooks:** Create `api/webhooks/stripe` to listen for membership payments.
* *Action:* When Stripe confirms payment -> Update `user.roles` in DB (add 'member').
* *Action:* When Stripe confirms failure -> Update `user.roles` in DB (remove 'member').



### B. The Operations App (`apps/shopop`)

* **Middleware:** Strict Gating.
```typescript
// apps/shopop/middleware.ts
// If session.user.roles DOES NOT include "volunteer" -> Redirect to /unauthorized

```



### C. The Consumer Apps (`apps/www`, `apps/classes`, `apps/shop`)

* **Middleware:** Soft Gating. Check if user exists. If not, redirect to `auth.sdfwa.org/signin`.
* **UI Logic:**
* Use `auth.api.getSession()` to check roles.
* If `roles.includes('volunteer')`, show "Edit Class" or "Machine Maintenance" buttons.



---

## 6. The "Account Linking" Flow

*Since Member Email (Personal) != Volunteer Email (Google Workspace)*

1. **Initial State:** User exists with Personal Email (Member Role).
2. **User Action:** User logs into Member Portal (`www.sdfwa.org/profile`).
3. **UI:** "Connect Volunteer Account" button.
4. **Action:** Triggers `authClient.signIn.social({ provider: "google" })`.
5. **Result:** Better Auth detects active session and links the Google Account to the existing User ID.
6. **Next Login:** User can now click "Login with Google" at `auth.sdfwa.org`. This will trigger the "Google Provider" logic defined in Section 4, unlocking Volunteer access.

---

## 7. Migration & Deployment Checklist

1. Initialize Turborepo.
2. Set up `packages/db` with Drizzle and connect to Neon/Postgres.
3. Deploy `apps/auth` first to establish the cookie domain.
4. Set environment variable `BETTER_AUTH_URL=https://auth.sdfwa.org` in all apps.
5. Set environment variable `BETTER_AUTH_COOKIE_DOMAIN=.sdfwa.org`.
 
---

## 8. MVP

Goals for the minimum-viable product (MVP) to validate cross-subdomain auth and role gating:

1. Create simple Next.js apps for each top-level app (`apps/www`, `apps/shop`, `apps/classes`, `apps/diw`, `apps/shopop`, and `apps/auth`).
2. For `www`, `shop`, `classes`, and `shopop` provide a single `Hello World` page that:
   - Renders a minimal user info block (id, email, image) fetched from the auth session (dev: read from `localStorage` key `sdfwa_user`).
   - Renders the array of roles returned by the session (e.g. `["member"]` or `["member","volunteer"]`).
3. For `apps/auth` provide a minimal local-only credential provider for testing:
   - A simple username/password login form that accepts the single test credential `admin` / `admin`.
   - This login path is strictly for local/dev testing and must be protected/removed in production deployments.

Notes:
- Keep each app intentionally minimal for the MVP — focus on the cross-domain cookie behavior, session shape, and role rendering.
- `apps/shopop` should implement the strict middleware gate but the MVP middleware can simply redirect non-volunteers to `/unauthorized`.

## 9. Environment Variables

Overview: the database connection variables are provided externally. The lists below enumerate non-DB and integration variables each app will expect. Include `NODE_ENV` and standard runtime variables where appropriate.

- Shared / Auth-Related (required by all consumer apps):
  - `BETTER_AUTH_URL` — URL of the IdP (e.g. `https://auth.sdfwa.org`).
  - `BETTER_AUTH_COOKIE_DOMAIN` — Cookie domain for session sharing (e.g. `.sdfwa.org`).
  - `BETTER_AUTH_SECRET` or `SESSION_SECRET` — Secret used by Better Auth for signing tokens.

- `apps/auth` (Identity Provider):
  - `DATABASE_URL` — Postgres connection string (provided externally).
  - `BETTER_AUTH_COOKIE_DOMAIN` — `.sdfwa.org`.
  - `BETTER_AUTH_URL` — `https://auth.sdfwa.org`.
  - `BETTER_AUTH_SECRET` / `SESSION_SECRET` — cryptographic secret for sessions.
  - `STRIPE_SECRET_KEY` — Stripe secret key for creating customers/subscriptions.
  - `STRIPE_WEBHOOK_SECRET` — Signing secret for webhook validation.
  - `COOKIE_SECURE` — boolean override for cookie `secure` flag in non-HTTPS local dev (e.g. `false` locally).

- Consumer apps (`apps/www`, `apps/shop`, `apps/classes`, `apps/diw`, `apps/shopop`):
  - `BETTER_AUTH_URL` — must point to the IdP (e.g. `https://auth.sdfwa.org`).
  - `BETTER_AUTH_COOKIE_DOMAIN` — `.sdfwa.org`.
  - `NEXT_PUBLIC_APP_URL` — app's public URL (e.g. `https://www.sdfwa.org`). Useful for OIDC redirects or links.
  - `DATABASE_URL` — optional (only if app needs DB access); otherwise, read-only interactions should happen via the IdP API.
  - `STRIPE_PUBLISHABLE_KEY` — optional for shop/use pages that create checkout sessions.

- Packages / shared (packages/auth-client, packages/db):
  - `DATABASE_URL` — used by `packages/db` migrations and by the Drizzle adapter.
  - `BETTER_AUTH_COOKIE_DOMAIN` and `BETTER_AUTH_URL` are referenced by `packages/auth-client` but are supplied by the host app's environment.

Local development notes:
- Browsers require HTTPS for cookies across domains. For local development, document an approach (for example: use `mkcert` + host entries to map local domains like `auth.local.sdfwa.test`, `www.local.sdfwa.test`, and set `BETTER_AUTH_COOKIE_DOMAIN=.local.sdfwa.test`).
- Provide an override for cookie domain and `COOKIE_SECURE=false` in local `.env` files so the MVP credential login (`admin/admin`) can work in development.

Add a `.env.example` at repo root listing the above keys (DB keys left empty) so developers can copy to `.env.local` during setup.