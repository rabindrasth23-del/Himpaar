# Himpaar: Technical Requirements Document (MVP)

Status: nothing built. Package names must be confirmed on npm before use. Items marked PENDING need a founder decision.

## 1. Architecture

```
Merchant / Payer / Developer
        |                \
   Web app (Vite+React)   SDK (@himpaar/sdk)
        |                 /
        +------> API server (Fastify) <------+
                   |    |    |               |
                   |    |    +--> Export document generator (pdfkit)
                   |    +-------> Sandbox simulator (signed fake bank events)
                   v
              PostgreSQL (Prisma tables + pgledger ledger)
```
All money rules live in the API. The web app never touches the database. The simulator sends signed events through the same verified handler a real bank connection will use later.

## 2. Stack and packages (verify each on npm before installing)

**Backend:** fastify 5.x, @fastify/cookie, @fastify/cors, @fastify/rate-limit, @fastify/static (serves built Vite app in production), @fastify/type-provider-zod 1.x (official, requires Zod ≥ 4.2), zod 4.x, @prisma/client ^7.10.0 (pinned — **do not install at `latest`**; the `prisma` CLI's `latest` tag points to 8.0.0-rc, an unstable RC, while `@prisma/client` latest is stable 7.10.0; installing both at `latest` will mismatch), @node-rs/argon2 (primary, prebuilt Rust binaries), pdfkit, standardwebhooks, nepali-date-library, pino-pretty (dev only; Fastify's built-in pino logger is used directly, no separate `pino` install). Dev: typescript 6.0.x, tsx, prisma ^7.10.0 (pinned), vitest, @types/node ^24, @types/pdfkit, eslint, typescript-eslint, prettier.
**Frontend:** react, react-dom, react-router, @tanstack/react-query, react-hook-form, @hookform/resolvers, zod, tailwindcss v4 (+ @tailwindcss/vite), shadcn/ui via its official CLI, lucide-react. Dev: vite 8.x, @vitejs/plugin-react, typescript 6.0.x, vitest, @testing-library/react.
**SDK:** standardwebhooks. Dev: tsup, typescript 6.0.x, vitest.
**Shared:** zod.
**Infrastructure (local):** Docker Compose with the official PostgreSQL image (current stable major).

## 3. Repo layout
See `AGENTS.md` section 4.

## 4. Data model (first pass)

Prisma tables: `Merchant`, `User`, `Session` (server-side, stored in Postgres; stores SHA-256 hash of 32-byte random token; absolute expiry 7 days, idle expiry 24 hours), `KycRecord` (simulated), `ApiKey` (prefix, sha256 hash, revoked_at), `PaymentLink` (token, amount, currency, status, expires_at; status timestamps: paid_at, expired_at, cancelled_at), `Payment` (link_id, method, status; status timestamps: pending_at, succeeded_at, failed_at, expired_at), `BankEvent` (event_id unique, payload hash — insert-only, deduplication key for simulate endpoint), `BankEventResult` (event_id unique, processed_at, outcome, error — insert-only), `Settlement` (payment_id, gross_usd_cents, fee_usd_cents, rate_micro, net_npr_paisa, status; status timestamps: settled_at, failed_at), `Document` (settlement_id, json, pdf_path or bytes, sha256), `WebhookEndpoint` (url, secret), `WebhookDelivery` (event, attempt, status, next_attempt_at), `IdempotencyRecord` (merchant_id, key, request_hash, response, expires_at), `AuditLog`.
Ledger: pgledger tables and functions installed in a **separate Postgres schema** (`pgledger`), added via a Prisma migration created with `prisma migrate dev --name pgledger --create-only`, then the generated `migration.sql` is manually edited to contain the raw SQL **in this order**: (1) `vendor/scoville-pgsql-ulid/ulid-to-uuid.sql`, (2) `vendor/scoville-pgsql-ulid/uuid-to-ulid.sql`, (3) `pgledger.sql`, all with `SET search_path = pgledger`. pgledger vendors the scoville/pgsql-ulid helper functions (ULID↔UUID conversion, BSD-3-Clause licence); these must run before `pgledger.sql` or it will fail on missing functions. Keep both licences in `third_party/pgledger/` and `third_party/pgsql-ulid/`. App code uses Prisma interactive transactions with `$queryRaw` / `$executeRaw` to write to pgledger tables so that ledger and app writes commit together.
Rules: BIGINT amounts, currency column on every money row, `created_at` everywhere, foreign keys, CHECK constraints for positive amounts. Ledger tables and BankEvent/BankEventResult are insert-only (UPDATE/DELETE blocked at DB level). Payment, Settlement and PaymentLink tables may change status, but every transition is recorded with a timestamp.

## 5. Ledger design (PROPOSED, needs founder and accountant approval before coding)

One pgledger ledger per currency. For each successful payment:
1. USD receipt: value moves into the merchant's USD balance.
2. Fee: part moves from the merchant's USD balance to a Himpaar fee account.
3. Conversion: USD leaves the merchant balance to an FX clearing account; NPR enters the merchant's NPR balance from an FX clearing account at the simulated rate.
4. Settlement: NPR balance is marked settled to the merchant.
Corrections are reversing transfers. UPDATE/DELETE on ledger tables are blocked at the database level. Verify pgledger's own function names and constraints from its repository before writing code. Keep its MIT licence text in `third_party/pgledger/`.

## 6. State machines
- PaymentLink: `open -> paid | expired | cancelled`
- Payment: `created -> pending | expired`; `pending -> succeeded | failed | expired`. Terminal: `succeeded`, `failed`, `expired`.
  - Expiry: a payment link past its `expires_at` expires any `created` payment (checked on read and on pay attempts, no cron). A payment stuck in `pending` for over 30 minutes expires. A `succeeded` payment never becomes `expired`.
- Settlement: `pending -> settled | failed`
- WebhookDelivery: `pending -> delivered | failed -> dead`
Implement each as one function with an allowed-transitions map. Illegal transitions throw. Tests for every allowed and illegal transition. Every status change sets the corresponding timestamp column (e.g. `succeeded_at = now()`).

## 7. API summary (all under `/v1`, test mode only)

Dashboard auth: `POST /auth/signup`, `/auth/login`, `/auth/logout`, `GET /auth/me`.
Merchant: `POST /kyc` (simulated), `GET /merchant`.
Keys: `POST /api-keys`, `GET /api-keys`, `DELETE /api-keys/:id`.
Links: `POST /payment-links` (Idempotency-Key), `GET /payment-links`, `GET /payment-links/:id`.
Public: `GET /public/payment-links/:token`, `POST /public/payment-links/:token/simulate` (SANDBOX_MODE only, rate limited). The simulate endpoint has no merchant context; deduplication uses `BankEvent.event_id`, not a merchant `Idempotency-Key`.
Payments: `GET /payments`, `GET /payments/:id`.
Settlements: `GET /settlements`, `GET /settlements/:id`.
Documents: `GET /documents`, `GET /documents/:id`, `GET /documents/:id/pdf`.
Webhooks: `POST /webhook-endpoints`, `GET /webhook-endpoints`, `DELETE /webhook-endpoints/:id`, `GET /webhook-deliveries`, `POST /webhook-deliveries/:id/redeliver`.
Health: `GET /health`.
Auth: dashboard uses a session cookie; API clients use `Authorization: Bearer hp_test_...`.
Error response shape (all errors): `{ "error": { "code": "<MACHINE_CODE>", "message": "<human string>", "details": <object|null>, "request_id": "<uuid>" } }`.

## 8. Webhooks
Use the Standard Webhooks specification and its official JavaScript library for signing and verifying. Do not write a custom scheme. Outbound events: `payment.succeeded`, `payment.failed`, `settlement.settled`, `document.created`.
Retry schedule: **5 total attempts**: immediate, then +1 min, +5 min, +30 min, +2 hours. If all 5 fail, status becomes `dead`. 10-second timeout per attempt. Stored in `WebhookDelivery`.
Worker: one polling loop in the API process. Claims rows with `FOR UPDATE SKIP LOCKED` to allow safe concurrency if multiple instances ever run. Graceful shutdown: stop claiming new rows on `SIGTERM`/`SIGINT`, finish in-flight deliveries, then exit. Note: on free-tier hosts that sleep, the worker pauses while the process is asleep; deliveries resume when the API wakes.
Simulated inbound bank events use the same verification with a separate secret.

## 9. Idempotency
`Idempotency-Key` required on money-affecting POSTs. Unique on (merchant, key). Same key and same request body returns the stored response. Same key with a different body is rejected. Keys expire after **24 hours**.

## 10. Security
- Secrets only in environment variables. `.env.example` committed, `.env` ignored.
- **Passwords:** `@node-rs/argon2` hashes. Minimum 10 characters, maximum 128. No composition rules. Reject if password equals the email.
- **API keys:** stored as prefix + SHA-256 hash. Look like `hp_test_<random>`, shown once.
- **Sessions:** random 32-byte cookie token; store only its SHA-256 hash in the `Session` table. Absolute expiry 7 days, idle expiry 24 hours, multiple sessions allowed, delete on logout, delete all on password change.
- **Cookies:** `HttpOnly`, `SameSite=Lax`, `Secure` in production. Same-origin deployment (Fastify serves the built Vite app via `@fastify/static`); dev uses Vite's built-in proxy.
- **CSRF:** for every cookie-authenticated state-changing request, require `Content-Type: application/json` and verify the `Origin` header equals `WEB_URL` (use `Referer` if `Origin` is absent; reject if neither is present). Bearer API-key requests skip this check. Tests required.
- **Rate limits (MVP defaults, in config):** global 100 req/min/IP; login and signup 10/min/IP; public simulate 20/min per IP+token; API key creation 10/hour per merchant; API-key requests 60/min per key.
- Input validated with Zod on every route. Raw body preserved for signature checks.
- Never log secrets or full keys. Redact in Fastify's built-in pino logger.
- Separate security audit log. Least-privilege database user.
- Commit the lockfile. Run a dependency audit before the demo.

## 11. Export document
Generated on settlement. PDF plus JSON containing: document ID, title "Himpaar Settlement Advice (simulated)", merchant name and PAN/VAT as entered (unverified), payer name and country, invoice reference, gross USD, fee, rate with label "simulated", NPR net, timestamps in AD and BS, Nepali fiscal year label, SHA-256 of the JSON. Footer on every page: "SIMULATED, NOT AN OFFICIAL DOCUMENT". Any tax or rebate wording comes only from `UNVERIFIED_` constants.

## 12. Nepal rules module
`apps/api/src/compliance/nepal.config.ts` holds every `UNVERIFIED_` constant. Default demo fee: `UNVERIFIED_DEMO_FEE_BPS = 100` (1%, labeled simulated).

`CountryRules` interface shape:
```ts
interface CountryRules {
  country: string;                       // "NP"
  currencyPair: { from: string; to: string }; // { from: "USD", to: "NPR" }
  documentTemplate: string;              // template identifier
  fiscalYearLabel(date: Date): string;   // e.g. "2083/84"
}
```
Only Nepal is implemented.

Dates: use `nepali-date-library` (MIT, see `OPEN_SOURCE.md`). Add tests on key dates, because BS calendar data is published about a year ahead and libraries can differ.
FX: store as NPR per USD × 1,000,000. Fee formula: `fee_usd_cents = roundHalfUp(gross_usd_cents × fee_bps, 10000)`. Net: `net_usd_cents = gross_usd_cents - fee_usd_cents`. Settlement formula: `net_npr_paisa = roundHalfUp(net_usd_cents × rate_micro, 1000000)`. Rounding function: `roundHalfUp(n, d) = (2n + d) / (2d)` using integer division (BigInt). One function, one file. Tests: exact ties, just below and above a tie, 1-cent amounts, very large amounts, zero and negative rejected. Fee is always in the same currency as gross (USD cents); never subtract a fee in a different currency. Reference rates come from NRB's published rates by manual copy for the demo. Check NRB's terms before automating.

## 13. Simulator
Lives in `apps/api/src/simulator`. Takes a payment link and an outcome (success, decline, pending then success). Produces a signed bank event and sends it to the internal event handler, never directly to the database. Disabled unless `SANDBOX_MODE=true`. A test proves it is disabled otherwise.
**"Pending then success" outcome:** the simulate endpoint creates an initial `pending` bank event. A separate button on the Sandbox dashboard page triggers the second signed event that moves the payment to `succeeded`. This lets the demo show a two-step async flow.

## 14. Testing
Vitest for unit and API tests (Fastify `inject`). Test list in `AGENTS.md` section 7. Playwright E2E test: **skipped for this phase**. CI runs typecheck, lint, test.

## 15. Deployment (demo only, free tiers, fake data)
Same-origin: Fastify serves both the API (under `/v1`) and the built Vite app (via `@fastify/static`) from **one Render free web service**. No Cloudflare Pages. Dev uses Vite's built-in proxy. Free Postgres that does not expire (for example Neon). Do not use a database that expires after 30 days. Render free tier sleeps when idle and takes up to about a minute to wake, so open it before any demo. Free tiers change; check each pricing page when signing up. Move to paid, backed-up, compliant hosting before any real money or personal data.

## 16. Environment variables
`NODE_ENV`, `PORT`, `DATABASE_URL`, `DATABASE_MIGRATE_URL` (superuser or owner connection string used only by `prisma migrate`; distinct from `DATABASE_URL` which is the app role), `SANDBOX_MODE`, `SESSION_SECRET`, `SIMULATOR_WEBHOOK_SECRET`, `WEB_URL`, `API_URL`, `LOG_LEVEL`, `UNVERIFIED_DEMO_FX_NPR_PER_USD_MICRO`, `UNVERIFIED_DEMO_FEE_BPS`.

## 17. Milestones (YC deadline reported as Nov 2, 2026)
- **Week 1 (Oct 5 to 11):** scaffold, database, auth, API keys, payment link creation, dashboard shell.
- **Week 2 (Oct 12 to 18):** simulator, state machines, ledger, settlement, idempotency, signed events, tests.
- **Week 3 (Oct 19 to 25):** export document, dashboard screens, SDK, failure tests, deployment, demo script.
- **Week 4 (Oct 26 to Nov 1):** polish, record demo, finish and submit the application early.
Interviews, the bank email and the lawyer call run in parallel every week.

### Cut-list (in order, if we fall behind)
1. Webhook delivery log UI
2. Overview charts
3. Roadmap page polish
4. Documents preview (keep download)

**Never cut:** payment links, simulator, ledger, settlement, export document, SDK, money tests.

### Scripts
- `pnpm db:reset` — drops and recreates the database, runs all migrations.
- `pnpm db:seed` — inserts fake demo data (labeled "simulated").

## 18. Resolved decisions
~~Session and cookie approach~~ → decided: Postgres sessions, same-origin deployment, Vite proxy in dev.
~~Bikram Sambat package~~ → decided: `nepali-date-library`.
~~Idempotency expiry~~ → decided: 24 hours.
~~Default demo fee~~ → decided: `UNVERIFIED_DEMO_FEE_BPS = 100`.
~~Playwright E2E~~ → skipped.
~~BankEvent.processed_at~~ → decided: BankEvent stays insert-only. Processing recorded in a separate insert-only `BankEventResult` table (`event_id` unique, `processed_at`, `outcome`, `error`).
~~pgledger and Prisma~~ → decided: install pgledger in its own Postgres schema (`pgledger`), not in `public`. Keep it out of `schema.prisma`. Use Prisma interactive transactions with `$queryRaw` for joint commits. If coexistence fails, fall back to an idempotent script (`pnpm db:ledger`) run after Prisma migrations.
~~CSRF~~ → decided: require `Content-Type: application/json` and verify `Origin` header (or `Referer`) for cookie-authenticated state-changing requests. Bearer API-key requests skip.
~~Sessions~~ → decided: 32-byte random token, SHA-256 hash stored, 7-day absolute / 24-hour idle expiry.
~~Passwords~~ → decided: min 10, max 128, no composition rules, reject if equals email.
~~Rate limits~~ → decided: see §10.
~~Hosting~~ → decided: single Render web service, @fastify/static, no Cloudflare Pages.
~~Rounding~~ → decided: round half up, BigInt only. See §12.

**Still pending (resolve in Prompt 3):**
1. ~~Ledger account design~~ → approved by founders, pending accountant review. See `prompt3_revised_design.md` and `prompt3_q1_q3.md`.
2. pgledger coexistence proof (run Prisma migrate twice and show pgledger objects survive).
3. Settlement state machine: `pending → settled | failed | reversed`, `settled → reversed`. Illegal transitions tested.

