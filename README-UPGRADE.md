# Upgrade Notes: Clerk-Optional TaskFlow

This companion README records the application changes made for deployments that
need to run without Clerk credentials. The existing infrastructure and
deployment files were not changed.

## What changed

- **Clerk is optional.** When `VITE_CLERK_PUBLISHABLE_KEY` is absent from the
  frontend build and `CLERK_SECRET_KEY` is absent from the API, the app opens in
  guest mode instead of crashing or rendering Clerk sign-in screens.
- **Guest data is isolated per browser.** The API creates a random guest
  identity and stores it in a signed, `HttpOnly`, `SameSite=Lax` cookie. In
  production the cookie is marked `Secure`. Existing API ownership and
  workspace-membership checks still apply; requests do not share a global
  anonymous user.
- **Guest sessions need no Clerk email lookup.** New guest workspaces use a
  local placeholder identity and skip Clerk's user API.
- **Partial server-side configuration fails clearly.** A server-side
  `CLERK_PUBLISHABLE_KEY` without `CLERK_SECRET_KEY` is rejected at startup.
  When Clerk is enabled, configure the frontend publishable key as well.
- **Builds no longer require runtime settings.** Both Vite apps default to
  `PORT=5173` and `BASE_PATH=/` when building. Invalid port values are still
  rejected. The API still needs its runtime `PORT`.
- **API hardening.** CORS only grants browser access to explicitly configured
  origins; state-changing API requests validate their origin; request body
  sizes are bounded; and API responses include security/cache headers.
- **Guest-mode guidance in the UI.** The workspace screen identifies guest
  mode and explains that clearing cookies or switching browsers creates a new
  guest workspace.

## Configuration

The app still requires a working PostgreSQL `DATABASE_URL` and a runtime `PORT`
for the API. Clerk credentials are optional:

- To use guest mode, leave `CLERK_SECRET_KEY`,
  `CLERK_PUBLISHABLE_KEY`, and `VITE_CLERK_PUBLISHABLE_KEY` unset.
- To use Clerk, provide `CLERK_SECRET_KEY` to the API and
  `VITE_CLERK_PUBLISHABLE_KEY` at frontend build time. Set the API-side
  `CLERK_PUBLISHABLE_KEY` as a fallback when host-based key discovery needs it.
- In guest mode, set a stable random `SESSION_SECRET` of at least 32 bytes so
  existing guest cookies remain valid across API restarts. Generate one with
  `openssl rand -base64 32`. If it is omitted, the API creates an ephemeral
  secret and logs a warning; guest sessions will reset when that process
  restarts.
- If the browser app and API use different origins on the same site, set
  `CORS_ALLOWED_ORIGINS` to a comma-separated list of exact origins, for
  example `https://app.example.com`. Same-origin deployments need no CORS
  entry. Guest cookies intentionally use `SameSite=Lax`; for separate sites,
  serve the API through the app's same-origin reverse proxy instead.

Guest mode is intended for single-browser use. Guest workspaces are not linked
to an email or account and cannot follow a user to another device. Configure
Clerk for account-based access and cross-device identity.

## Verification

Run from the repository root:

```bash
pnpm install --frozen-lockfile
pnpm run build
```

The build does not require `PORT`, `BASE_PATH`, or Clerk keys. The API's
runtime still requires its normal database and port configuration.
