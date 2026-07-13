# TaskFlow

TaskFlow is a SaaS task-management product: teams get shared workspaces with projects, Kanban-style task boards, and an activity feed, while individuals get the same tool for personal task tracking.

## Run & Operate

- `pnpm --filter @workspace/taskflow run dev` — run the frontend (served at `/`)
- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec (see Gotchas)
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env/secrets: `DATABASE_URL` (Replit-managed Postgres), `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`, `SESSION_SECRET`
- See `setup.txt` at the repo root for the full setup/operations reference.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite (`artifacts/taskflow`), wouter routing, framer-motion, Recharts
- Auth: Replit-managed Clerk (`@clerk/express` on the server, `@clerk/react` on the client) — Clerk is the sole identity source of truth, no local `users` table
- API: Express 5 (`artifacts/api-server`)
- DB: PostgreSQL + Drizzle ORM (`lib/db`)
- Validation: Zod v3 in generated code (`lib/api-zod`), `drizzle-zod`
- API codegen: Orval, generating from `lib/api-spec/openapi.yaml`
- Build: esbuild (CJS bundle) for the API server, Vite static build for the frontend

## Where things live

- `lib/db/src/schema/` — Drizzle tables: `workspaces`, `workspace_members`, `projects`, `tasks`, `activity_log`
- `lib/api-spec/openapi.yaml` — source of truth for the API contract
- `lib/api-zod/src/` — generated zod schemas/types (do not hand-edit `index.ts`, it's regenerated every codegen run)
- `artifacts/api-server/src/routes/` — workspaces, projects, tasks, insights route handlers
- `artifacts/api-server/src/middlewares/` — Clerk proxy + `requireAuth`
- `artifacts/taskflow/src/pages/` — Landing, Workspaces, Workspace Dashboard, Projects, Project Board (Kanban), Members

## Architecture decisions

- No local `users` table — Clerk is the identity source of truth; membership rows reference Clerk user IDs directly.
- Aggregates (member/project/task counts, done counts) are computed at query time server-side, not stored as denormalized columns, to avoid drift.
- Pending workspace invites are stored by email and activated automatically the next time a matching Clerk user calls `GET /workspaces`.
- A brand-new user with zero active workspace memberships is auto-bootstrapped a personal workspace + starter project on first load.
- `date` columns use Drizzle string mode; a `toDueDateString()` helper converts `Date -> "YYYY-MM-DD"` on write, relying on the generated zod schema's `coerce.date()` to convert back on read.

## Product

- Landing page (marketing) at `/`, gated app behind Clerk auth
- Workspaces list, with create-workspace (personal or team) flow
- Workspace dashboard: status summary, per-project chart, activity feed
- Projects grid per workspace, with task completion stats
- Kanban-style project board: create/edit/delete/move tasks by status
- Member management: invite by email, remove members, role-based permissions (owner/admin/member)

## User preferences

- Visual direction: deep space dark mode, electric blue primary accent, glassy/blurred panel surfaces, smooth framer-motion transitions — "mission control" feel. Keep new UI consistent with this established aesthetic rather than introducing a new one.

## Gotchas

- Always run `pnpm --filter @workspace/api-spec run codegen` (not raw `orval`) after editing `openapi.yaml` — the codegen script chains a required `fix-barrel.mjs` post-process step that resolves a Params-name collision orval otherwise produces. See `.agents/memory/orval-zod-barrel.md`.
- Generated code imports plain `"zod"` (v3). Any route file using `z.infer` on a generated schema must also import `z` from `"zod"`, not `"zod/v4"`, or inference silently resolves to `unknown`.
- Clerk is currently running with development keys (visible as an in-app dev banner) — switch to production keys before going live.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See the `clerk-auth` skill for auth setup/customization details
