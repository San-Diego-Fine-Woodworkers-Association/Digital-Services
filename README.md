# SDFWA Digital Services — MVP bootstrap

This repository contains minimal Next.js app scaffolds to validate cross-subdomain authentication for local development.

Quick notes:

- Dev credential: `admin` / `admin` — use at `apps/auth` sign-in page.
- The dev sign-in stores a simple session object in `localStorage` under `sdfwa_user`.
- Consumer apps (`www`, `shop`, `classes`, `diw`, `shopop`) read `sdfwa_user` from `localStorage` and render user info and roles.
- `shopop` contains a simple gate that requires the `volunteer` role.

Local testing (suggested):

1. Serve each app using your Next.js dev server or a simple static server for testing pages. Each app is a minimal Next.js App Router structure under `apps/*`.
2. Open the `apps/auth` sign-in page (e.g. http://localhost:3000/auth/signin if you run the auth app locally) and sign in with `admin/admin`.
3. After signing in, open the consumer app (for example, http://localhost:3001/) and the Hello World page will read the dev session from `localStorage`.

Notes about cross-subdomain cookies and production:

- This MVP uses `localStorage` for simplicity in local development. Production must use secure root-domain cookies (e.g. `domain=.sdfwa.org`, `secure`, `sameSite=None`, `httpOnly`) and the `apps/auth` deployment should manage session cookies.
- See `.github/THE_PLAN.md` for the main plan and environment variable expectations.
