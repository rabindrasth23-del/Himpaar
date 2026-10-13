# Himpaar Deployment Guide (Vercel & Neon)

**Status:** Sandbox MVP. All payments are simulated. No real money moves. Nepal only.

---

## 1. Overview & Architecture

Himpaar's deployment is split into two phases:
1. **Frontend Only (Current - Part B):** Vite Single Page Application running as a static build on Vercel with `VITE_API_MODE=mock`. No database connection or serverless API is deployed yet.
2. **Full Monorepo (Future - Phase 3):** Static Vite frontend + Fastify serverless API function deployed in the same Vercel project, with `/v1/*` routed to Fastify and all other requests served by the Vite SPA.

---

## 2. Frontend Deployment (Current Phase)

### Project Settings on Vercel
* **Framework Preset:** Vite
* **Root Directory:** `.` (repository root) or `apps/web`
* **Build Command:** `pnpm --filter @himpaar/web exec vite build` (or `vite build` if Root Directory is `apps/web`)
* **Output Directory:** `apps/web/dist` (or `dist` if Root Directory is `apps/web`)
* **Install Command:** `pnpm install`

### Environment Variables on Vercel (Frontend Only)
* `VITE_API_MODE`: `mock`
* `VITE_SANDBOX_MODE`: `true`
* `VITE_API_URL`: leave empty (defaults to same-origin)

> [!IMPORTANT]
> **No database URLs or secrets go on Vercel for the frontend deployment.**

### Routing & Static Asset Safety
* In `vercel.json`, the catch-all rewrite (`/(.*) -> /index.html`) handles client-side routing (`/pay/:token`, `/dashboard/overview`, `/login`).
* **Static Assets:** On Vercel, physical static assets (`/assets/*`, `/favicon.svg`, `/robots.txt`, `/himpaar-mark.svg`) are resolved by the CDN file-system handler before any rewrite rule is evaluated.
* **Search Engine Protection:**
  - `apps/web/public/robots.txt` specifies `Disallow: /`.
  - `vercel.json` adds `X-Robots-Tag: noindex, nofollow` to all HTTP responses.

### Sharing the URL While Previews are Protected
* By default, Vercel enables **Deployment Protection** (Vercel Authentication) on all **Preview** deployments (branches and pull requests).
* **To share the demo with external reviewers:**
  1. Share the **Production URL** (e.g., `https://himpaar.vercel.app`), which serves the `main` branch.
  2. Because the production URL has the `X-Robots-Tag: noindex, nofollow` header and `robots.txt`, search engines will not index it, while anyone with the direct link can access and test the demo.
  3. If you want password protection on previews or production, configure **Settings → Deployment Protection → Password Protection** in the Vercel Dashboard.

---

## 3. Future API Deployment (After Phase 3 Tests Pass)

> [!WARNING]
> Do NOT deploy the API until Phase 3 (simulate, ledger, and state machine) tests pass locally with real output shown to founders.

### How Fastify Runs as a Vercel Function
* In a serverless environment, Fastify does not call `app.listen()`.
* It runs via the standard serverless bridge in an entrypoint (e.g. `api/index.ts`):
  ```typescript
  import { buildApp } from "../apps/api/src/app.js";

  const app = buildApp();

  export default async function handler(req: any, res: any) {
    await app.ready();
    app.server.emit("request", req, res);
  }
  ```
* `await app.ready()` ensures all plugins, Fastify schemas, and route decorators are initialized on cold start.

### Monorepo & Custom Prisma Client Rules
* Prisma generates into `apps/api/generated/prisma`.
* Because this path is outside standard `node_modules`, Vercel's file tracer will not automatically package it unless:
  1. The build step explicitly runs `pnpm --filter @himpaar/api exec prisma generate`.
  2. `vercel.json` includes `includeFiles`:
     ```json
     {
       "functions": {
         "api/*.ts": {
           "includeFiles": "apps/api/generated/**"
         }
       }
     }
     ```

### Empirical Proof Requirements Before Cutover
Do not assume Vercel routing works:
1. **Path preservation test:** The rewrite in `vercel.json` must be empirically proven in a test deployment to pass the full original URL path (`/v1/...`) to Fastify's router without stripping the `/v1` prefix.
2. **Prisma runtime test:** The custom Prisma client in `apps/api/generated` must be empirically proven to load and query Neon via a live `GET /v1/health` check returning `{ "status": "ok", "db": "connected" }`.

---

## 4. Neon Database Setup & Management

### Database Separation
* **Never use developer personal databases for the hosted demo.**
* Create a dedicated Neon database specifically for the Vercel demo (e.g. `himpaar_demo`).
* Follow least-privilege security from `AGENTS.md` and `docs/TRD.md`:
  - Run `apps/api/scripts/setup-app-role.ts` to create the restricted `himpaar_app` role.
  - The `himpaar_app` role has insert/select privileges but cannot truncate, drop, or alter ledger tables.

### Migration Isolation Rule
* **Migrations MUST NEVER run on Vercel.**
* Migrations run exclusively from a developer machine using the superuser connection:
  ```powershell
  DATABASE_MIGRATE_URL="postgresql://neondb_owner:***@ep-***.neon.tech/himpaar_demo?sslmode=require" pnpm --filter @himpaar/api exec prisma migrate deploy
  ```

---

## 5. Environment Variables on Vercel (When API is Activated)

### Variables that GO on Vercel:
| Variable Name | Description | Example / Rule |
| :--- | :--- | :--- |
| `DATABASE_URL` | Pooled connection string with `himpaar_app` restricted role | `postgresql://himpaar_app:***@ep-***-pooler.neon.tech/himpaar_demo?sslmode=require` |
| `SESSION_SECRET` | 64-character random hex string for cookie session signing | `openssl rand -hex 32` |
| `SIMULATOR_WEBHOOK_SECRET` | Secret for HMAC signing simulated bank webhook deliveries | `whsec_...` |
| `SANDBOX_MODE` | Must be `true` | `true` |
| `WEB_URL` | Base URL of the deployed frontend for CSRF Origin checks | `https://himpaar.vercel.app` |
| `API_URL` | Base URL of the deployed API | `https://himpaar.vercel.app` |
| `LOG_LEVEL` | Pino logger level | `info` |
| `UNVERIFIED_DEMO_FX_NPR_PER_USD_MICRO` | Simulated exchange rate integer | `134250000` |
| `UNVERIFIED_DEMO_FEE_BPS` | Simulated fee basis points | `100` |

### Variables that MUST NEVER GO on Vercel:
* `DATABASE_MIGRATE_URL` — Superuser credentials. Kept strictly on local machines for manual migrations.
* `DATABASE_TEST_URL` — Disposable local/test database. Never stored in cloud environments.

---

## 6. Serverless Limitations & Security Rules

### Webhook Deliveries in Serverless Functions
* Vercel Functions terminate execution shortly after sending an HTTP response.
* Background workers (e.g., retrying failed webhook deliveries 5 times with exponential backoff) cannot run indefinitely in background threads.
* **MVP Sandbox Policy:** Webhook simulator attempts **one synchronous delivery** per simulated event. If the client endpoint fails, the delivery status is recorded as `failed` in the database. Background retries are deferred to Phase 4 (external queue / Upstash / QStash).

### CSRF & Origin Validation
* Every cookie-authenticated state-changing request requires `Content-Type: application/json`.
* Fastify verifies that the `Origin` header (or `Referer` if `Origin` is missing) matches `WEB_URL`.
* Direct API-key authenticated requests (`Bearer hp_test_...`) bypass the CSRF check as documented in `AGENTS.md`.
