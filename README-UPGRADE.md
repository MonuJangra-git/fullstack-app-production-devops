# Authentication upgrade

TaskFlow now uses Better Auth with the existing PostgreSQL database. Clerk and
browser-only guest sessions are no longer part of the application.

## Required configuration

Copy `.env.example` to `.env` and set:

- `DATABASE_URL`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB`
- `BETTER_AUTH_SECRET` (at least 32 random bytes)
- `BETTER_AUTH_URL` and `APP_URL`
- `PORT`
- `CORS_ALLOWED_ORIGINS` when the browser and API have different origins

Set `RESEND_API_KEY` and `AUTH_EMAIL_FROM` to enable password reset, OTP, and
invitation email delivery. In production, `RESEND_API_KEY` is required.
`AUTH_EMAIL_FROM` must use a sender address verified by your email provider.

## Database

The Better Auth tables are included in `lib/db/src/schema/auth.ts`. Apply the
schema to the target database before starting the API:

```bash
pnpm --filter @workspace/db push
```

Alternatively, run the repository helper, which reads `DATABASE_URL` from the
environment or `.env`:

```bash
./push-db-schema.sh
```

### Password reset

The sign-in page's **Forgot your password?** flow sends a six-digit,
short-lived OTP through Resend. The user must verify the OTP before choosing a
new password. Better Auth enforces OTP expiry and attempt limits, while
authentication endpoints also have stricter per-IP rate limits.

## Verification

```bash
pnpm install --frozen-lockfile
pnpm run build
```
