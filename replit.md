# Little Roam

A mobile stroller-rental concept for destination travel and monthly everyday use.

## Run & Operate

- `pnpm --filter @workspace/little-roam run dev` — run the Expo app. This is the product.
- `pnpm --filter @workspace/little-roam run test` — domain tests for pricing, exchanges, and storage parsing
- `pnpm run typecheck` — typecheck libs, the app, the API, and scripts. The unused mockup sandbox is excluded.
- `pnpm run build` — typecheck + build packages that define a build
- `pnpm --filter @workspace/api-server run dev` — optional. The API is not used by the app.
- The pilot does not read or write Postgres. `DATABASE_URL` is not required to run Little Roam. The Drizzle schema is still empty. Do not treat `GET /api/healthz` as a product check: it only reports that the process is up.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod 3 in the app and the generated API schemas
- API codegen: Orval (from OpenAPI spec). The spec is a health check only.
- Build: esbuild (CJS bundle) for the API. The phone app is Expo.
- Bookings live in on-device storage (`little-roam:bookings:v1`). The API server and database packages are unused by the pilot until a booking needs to leave the device.

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

- The first release is a device-local pilot prototype, not a commercial rental service. **Why:** the PRD leaves fulfillment partnerships, safety validation, payment policies, and commercial feasibility unresolved.
- Prices, destinations, equipment suitability, and service policies are illustrative pilot assumptions. Do not turn demo requests into claims of actual availability, reservations, payment, safety certification, or fulfillment.
- This is an independent development of a 2016 course concept, not an endorsed Bugaboo initiative. Do not imply a manufacturer partnership.
- Circular product return is an intended operating model, not evidence of environmental benefit. Environmental claims require lifecycle assessment.

## Product

Travel stroller booking, Basic/Premium monthly plans, accessory credit, growth exchanges, and return scheduling. All requests are stored locally; no live inventory, payments, or fulfillment is connected.

Premium costs 34 EUR more than Basic per month. That difference is a 40 EUR accessory credit each paid month, and one free exchange per paid month instead of Basic's one free exchange per 6 months. A month is 30 days. One open booking at a time. Age and weight can be updated, and an exchange swaps the active model on the device.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
