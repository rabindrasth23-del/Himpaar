# AGENTS.md: Himpaar (Sandbox MVP)

PROJECT_NAME: Himpaar

## 0. Read these first, in order
`docs/WORKFLOW.md`, `docs/PRD.md`, `docs/TRD.md`, `docs/OPEN_SOURCE.md`. If anything below conflicts with those files, stop and ask the founders.

## 1. What this project is
Himpaar is software that helps Nepali IT companies, agencies and freelancers collect payments from foreign clients through a licensed partner bank. This phase is a **sandbox MVP with fake money**. Nothing real moves. No bank partnership, licence or live payment exists yet, and no code, UI text or README may suggest otherwise. Nepal only.

Flow: payment link or invoice -> simulated foreign payment -> simulated NPR settlement -> export document -> merchant dashboard -> small SDK.

## 2. Truthfulness rules (apply always)
1. **Never invent** package names, function signatures, CLI flags or config keys. Before using any library, confirm it exists and read its API from the npm registry, official docs, or its type definitions in `node_modules`. If you cannot confirm it, write `UNVERIFIED` and ask.
2. **Never invent regulatory facts, tax rates, fees or document formats.** Put every such value in `apps/api/src/compliance/nepal.config.ts` as a constant prefixed `UNVERIFIED_`, with a comment saying who must confirm it (accountant, bank, NRB, IRD). Any screen or document using one must show "Simulated / unverified".
3. **Never claim** a bank partnership, licence, live payments, tax filing, or that the export document is an official FIRC or eFIRA equivalent. The document title is "Himpaar Settlement Advice (simulated)".
4. If a requirement is ambiguous, especially about money, **ask one clear question before writing code.**
5. **Never say tests pass without running them.** Paste the real output. Never edit or delete a test to make it pass.
6. One small task at a time. Show a short plan first, then the change. Explain money code in plain-English comments so the founders can review every line.
7. Add a dependency only if needed, only if listed in `docs/OPEN_SOURCE.md` or the stack below, or after the founders approve it. State its licence. Reject non-permissive licences (for example BSL).
8. Present the ledger account design to the founders for approval before coding it.

## 3. Scope
**P0:** payment links/invoices, simulated foreign payment, simulated NPR settlement, export document (PDF + JSON), merchant dashboard, TypeScript SDK, simulated merchant KYC step, sandbox demo controls.
**Roadmap (static page only, do not build):** real cards/ACH/SEPA/SWIFT, USD settlement, annual tax statements, tax filing, invoice financing, other countries.
**Not now:** real money, real bank/eSewa/Khalti integration, Pakistan/Bangladesh. Keep one small `CountryRules` interface; build Nepal only.

## 4. Stack (fixed; ask before swapping)
- TypeScript 6.0.x everywhere (highest version supported by typescript-eslint, tsup, vitest and Prisma 7), `strict` on. pnpm workspaces. Current Node LTS.
- Frontend: Vite + React + React Router + TanStack Query + React Hook Form + Zod + Tailwind CSS v4 (+ @tailwindcss/vite + shadcn/ui).
- Backend: Node + Fastify + @fastify/type-provider-zod (1.x, official, requires Zod ≥ 4.2) + Fastify's built-in pino logger (no separate `pino` install; add `pino-pretty` as dev dependency). Passwords: `@node-rs/argon2` (Rust-based, prebuilt binaries, skip node-gyp). Production: `@fastify/static` serves the built Vite app from the same origin.
- Database: PostgreSQL (Docker locally) + Prisma (^7, pinned). Ledger: pgledger SQL (MIT) installed in its own Postgres schema (`pgledger`), added as a raw SQL migration, with its licence and attribution kept in `third_party/`.
- Webhooks: Standard Webhooks (official JS library, MIT). Do not invent a signature scheme.
- Dates: `nepali-date-library` (MIT), plus tests on key dates.
- Documents: pdfkit. SDK: tsup. Tests: Vitest.

Repo layout:
```
apps/api        Fastify API, Prisma schema, compliance module, simulator
apps/web        Vite + React dashboard and hosted payment page
packages/sdk    @himpaar/sdk (create payment link, verifyWebhook)
packages/shared Zod schemas and types shared by api, web, sdk
third_party/    licences and attribution for copied open-source code
docs/           the documents listed in section 0
```

## 5. Money and data rules
- Money is **integer minor units** (BIGINT / BigInt): USD cents, NPR paisa. Never floats, anywhere. Every amount carries a currency code. Never mix currencies in one calculation.
- FX in the sandbox is a **fixed, configurable, labeled simulated rate** stored as an integer (NPR per USD x 1,000,000). One conversion function, **round half up** rounding rule (`roundHalfUp(n, d) = (2n + d) / (2d)` using integer division), tests on exact ties, near-ties, 1-cent amounts, large amounts, zero and negative rejected.
- **Fee rounding:** `UNVERIFIED_FEE_ROUNDING = "ceil"` — fee rounds up so the platform never undercharges. **NPR rounding:** `UNVERIFIED_NPR_ROUNDING = "floor"` — NPR rounds down so the merchant never gets more than the conversion warrants. Both marked UNVERIFIED in `nepal.config.ts`, pending accountant review.
- **Ledger tables (`pgledger_transfers`, `pgledger_entries`) and `BankEvent`/`BankEventResult` rows are insert-only.** UPDATE and DELETE are blocked at the database level (triggers on app tables, privilege restriction on pgledger tables). `pgledger_accounts` is updated only by pgledger's own SECURITY DEFINER functions; the app role has no direct UPDATE/DELETE on any pgledger table. Corrections are reversing entries.
- **Settlement state machine:** `pending → settled | failed | reversed`, `settled → reversed`. Reversing a settled payment reverses Transfer 5 first (settlement), then the payment transfers. Illegal transitions throw and are tested.
- **Payment, Settlement and PaymentLink tables may change status**, but every status transition must be recorded with a timestamp (e.g. `succeeded_at`, `settled_at`, `failed_at`, `expired_at`, `reversed_at`). The state-machine function enforces allowed transitions; illegal transitions throw and are tested. See `docs/TRD.md` section 6.
- Keep a separate security audit log (logins, key creation/revocation, settings changes).

## 6. API and security rules
- REST under `/v1`, test mode only. Keys look like `hp_test_<random>`; show once; store a prefix and a SHA-256 hash only. Never log secrets.
- **Idempotency:** every money-affecting POST requires an `Idempotency-Key` header, unique per merchant. A repeated key returns the original response; same key with a different request body is rejected. Keys expire after **24 hours**.
- **Webhooks:** Standard Webhooks signing and verification using the raw request body, with timestamp tolerance and replay rejection. The simulator's "bank events" go through the same verified path as real ones will.
- **Never trust the client.** Payment status changes only server-side from a verified internal event. The simulate endpoint exists only when `SANDBOX_MODE=true`.
- **Passwords:** `@node-rs/argon2` hashes. Minimum 10 characters, maximum 128. No composition rules. Reject if password equals the email.
- **Sessions:** random 32-byte cookie token; store only its SHA-256 hash in the `Session` table. Absolute expiry 7 days, idle expiry 24 hours, multiple sessions allowed, delete on logout, delete all on password change.
- **Cookies:** `HttpOnly`, `SameSite=Lax`, `Secure` in production. Same-origin deployment (Fastify serves the built Vite app via `@fastify/static`); dev uses Vite's built-in proxy.
- **CSRF:** for every cookie-authenticated state-changing request, require `Content-Type: application/json` and verify the `Origin` header equals `WEB_URL` (use `Referer` if `Origin` is absent; reject if neither is present). Bearer API-key requests skip this check. Tests required.
- **Rate limits (MVP defaults, in config):** global 100 req/min/IP; login and signup 10/min/IP; public simulate 20/min per IP+token; API key creation 10/hour per merchant; API-key requests 60/min per key.
- Payment-link tokens are random and unguessable (at least 128 bits).
- Never store card data. Cards are roadmap only.
- Validate every input with Zod.

## 7. Tests required before a money feature is done
Happy path, plus: declined payment, duplicate webhook, duplicate Idempotency-Key, same key with different body, bad signature, expired timestamp, wrong amount or currency, illegal state transition, rounding edge cases, attempted UPDATE/DELETE on the ledger, simulate endpoint disabled when `SANDBOX_MODE` is off, BS date conversion on key dates.

## 8. Definition of done (every task)
1. `pnpm typecheck`, `pnpm lint`, `pnpm test` run and pass, with real output shown.
2. No secrets in the diff. No `UNVERIFIED_` value used without a label.
3. A founder has read every changed line that touches money.
4. A short note says what changed, what is untested, and what is still assumed.

## 9. Never put in UI, README, demo or application
"Partnered with a bank", "live", "licensed", "files your taxes", "official export certificate", and any competitor claim, market figure or fee not marked verified with a source.
