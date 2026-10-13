# Himpaar Multi-Service Deployment Guide (Vercel & Neon)

**Status:** Sandbox MVP. All payments are simulated. No real money moves. Nepal only.

---

## 1. Architecture: Vercel Multi-Service Project

Himpaar is configured as a single Vercel project with two services defined in root `vercel.json`:
* **`web` service (root: `apps/web`):** Static Vite React SPA serving the dashboard, landing page, and hosted payment page.
* **`api` service (root: `apps/api`):** Fastify backend running on Vercel Fluid compute serverless runtime.

```
                              Public Internet (Single Domain)
                                            │
                                  ┌─────────┴─────────┐
                                  │   vercel.json     │
                                  │   Top-level       │
                                  │   Rewrites        │
                                  └─────────┬─────────┘
                                            │
                  ┌─────────────────────────┴─────────────────────────┐
                  ▼                                                   ▼
       Path: /v1/* or /health                             Path: /* (all other paths)
       Service: api (apps/api)                            Service: web (apps/web)
       Runtime: Fastify Function                          Runtime: Static Vite SPA
```

---

## 2. Public URLs & Routing Rules

| Public Path | Routed Service | Target Handler |
| :--- | :--- | :--- |
| `/health` | `api` | Fastify `GET /health` (returns `{ status: "ok" }`) |
| `/v1/health` | `api` | Fastify `GET /v1/health` (returns `{ status: "ok" }`) |
| `/v1/*` | `api` | Fastify API routes (`/v1/auth/*`, `/v1/payments/*`, etc.) |
| `/assets/*` | `web` | Physical static bundles (served directly by CDN) |
| `/favicon.svg`, `/robots.txt` | `web` | Static assets in `apps/web/public` |
| `/pay/:token`, `/dashboard/*` | `web` | Vite SPA fallback to `index.html` |

### Frontend API URL Configuration
The web client reads the API base URL from a single location in `apps/web/src/api/index.ts`:
```typescript
export const API_URL: string = import.meta.env.VITE_API_BASE ?? import.meta.env.VITE_API_URL ?? "";
```
When deployed on the same domain, leave `VITE_API_URL` and `VITE_API_BASE` **empty** (or set to same-origin). Any future change to domain or prefix requires changing only this single line.

---

## 3. Environment Variables Breakdown

In the Vercel Dashboard under **Project Settings → Environment Variables**:

### A. Web Service Variables:
| Variable Name | Value | Purpose |
| :--- | :--- | :--- |
| `VITE_API_MODE` | `mock` *(for first deploy)* | Uses in-memory sample data while API is verified |
| `VITE_SANDBOX_MODE` | `true` | Enables sandbox controls and simulated banners |
| `VITE_API_URL` | *(empty)* | Same-origin API routing |

### B. API Service Variables:
| Variable Name | Value | Purpose |
| :--- | :--- | :--- |
| `DATABASE_URL` | Pooled connection with `himpaar_app` | `postgresql://himpaar_app:***@ep-***-pooler.neon.tech/himpaar_demo?sslmode=require` |
| `SESSION_SECRET` | 64-char random hex string | `openssl rand -hex 32` |
| `SIMULATOR_WEBHOOK_SECRET` | Random webhook secret | `whsec_...` |
| `SANDBOX_MODE` | `false` *(for first test)* | Matches requirement (toggle to `true` when testing simulator endpoints) |
| `WEB_URL` | Deployed domain | e.g. `https://himpaar.vercel.app` |
| `API_URL` | Deployed domain | e.g. `https://himpaar.vercel.app` |
| `LOG_LEVEL` | `info` | Structured pino logger |
| `UNVERIFIED_DEMO_FX_NPR_PER_USD_MICRO` | `134250000` | Simulated FX rate (1 USD = 134.25 NPR) |
| `UNVERIFIED_DEMO_FEE_BPS` | `100` | Simulated fee (1.00%) |

### C. Variables that MUST NEVER GO on Vercel:
* ❌ `DATABASE_MIGRATE_URL` — Superuser owner connection (`neondb_owner`). Used **only** on a developer's machine to run migrations.
* ❌ `DATABASE_TEST_URL` — Integration test database. Kept strictly local.

---

## 4. Setting up the Dedicated Neon Demo Database

Follow these steps from your local machine before connecting the API:

### Step 1: Create a new database in Neon
1. Log into your Neon Console at [https://console.neon.tech](https://console.neon.tech).
2. Select your project, navigate to **Databases**, and click **New Database**.
3. Name it `himpaar_demo` (owner: `neondb_owner`).
4. Copy the **Direct (unpooled)** connection string:
   `postgresql://neondb_owner:PASSWORD@ep-DEMO.neon.tech/himpaar_demo?sslmode=require`

### Step 2: Run Prisma Migrations from your local machine
In your local terminal (PowerShell), run the migrations using the superuser connection:
```powershell
$env:DATABASE_MIGRATE_URL="postgresql://neondb_owner:PASSWORD@ep-DEMO.neon.tech/himpaar_demo?sslmode=require"
pnpm --filter @himpaar/api exec prisma migrate deploy
```
*This installs the pgledger schema, application tables, and append-only triggers on the demo database.*

### Step 3: Create the restricted `himpaar_app` role
Run the security script to create the limited application user:
```powershell
$env:DATABASE_MIGRATE_URL="postgresql://neondb_owner:PASSWORD@ep-DEMO.neon.tech/himpaar_demo?sslmode=require"
$env:APP_DB_PASSWORD="CHOOSE_A_STRONG_RANDOM_PASSWORD"
pnpm --filter @himpaar/api run db:setup-role
```

### Step 4: Configure the runtime URL for Vercel
In the Vercel dashboard, set `DATABASE_URL` for the API service to the **pooled** connection using the `himpaar_app` role:
`postgresql://himpaar_app:CHOOSE_A_STRONG_RANDOM_PASSWORD@ep-DEMO-pooler.neon.tech/himpaar_demo?sslmode=require`

---

## 5. Empirical Proofs Required Before Switching to Real API Mode

Do not switch `VITE_API_MODE=real` based on assumptions. Perform these 3 checks:

1. **Service Boot & Health Check Proof:**
   - Call `GET https://<deployed-domain>/health` in browser or curl.
   - Confirm status code is `200` and response body is `{"status":"ok"}`.
2. **Path Preservation Proof:**
   - Call `GET https://<deployed-domain>/v1/health`.
   - Open Vercel Function logs for the deployment.
   - Confirm Fastify logs: `"V1 Health check route invoked"` with `receivedUrl: "/v1/health"`.
   - This proves the rewrite delivers the `/v1/...` prefix intact to Fastify.
3. **Prisma Client Bundle Proof:**
   - Confirm build logs show: `✔ Generated Prisma Client (7.10.0) to .\generated\prisma`.
   - Confirm the API function boots without `Cannot find module .../generated/prisma` errors.

---

## 6. Rollback Procedures

If any runtime failure occurs after a deployment:
* **Instant Data Fallback:** In the Vercel Dashboard, edit the environment variable `VITE_API_MODE` and set it back to `mock`. Redeploy or trigger an instant cache purge.
* **Instant Deployment Rollback:** In the Vercel Dashboard, go to **Deployments**, locate the last known working deployment (e.g. the initial static build), click the three dots (`...`), and select **Instant Rollback**.
