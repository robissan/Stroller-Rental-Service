# Little Roam

A mobile stroller-rental concept for destination travel and monthly everyday use.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

- The first release is a device-local pilot prototype, not a commercial rental service. **Why:** the PRD leaves fulfillment partnerships, safety validation, payment policies, and commercial feasibility unresolved.
- Prices, destinations, equipment suitability, and service policies are illustrative pilot assumptions. Do not turn demo requests into claims of actual availability, reservations, payment, safety certification, or fulfillment.
- This is an independent development of a 2016 course concept, not an endorsed Bugaboo initiative. Do not imply a manufacturer partnership.
- Circular product return is an intended operating model, not evidence of environmental benefit. Environmental claims require lifecycle assessment.

## Product

Travel stroller booking, Basic/Premium monthly plans, accessory requests, growth exchanges, and return scheduling. All requests are stored locally; no live inventory, payments, or fulfillment is connected.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
