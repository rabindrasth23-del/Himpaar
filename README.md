# Himpaar

**Sandbox MVP. All payments are simulated. No real money moves.** Nepal only.

Himpaar is software that helps Nepali IT companies, agencies and freelancers collect payments from foreign clients through a simulated partner bank. This phase is a sandbox MVP with fake money. Nothing real moves. No bank partnership, licence or live payment exists yet.

## Folder map

```
himpaar/
  apps/
    api/                Fastify API, Prisma schema, compliance module, simulator
    web/                Vite + React dashboard and hosted payment page
  packages/
    sdk/                @himpaar/sdk (create payment link, verifyWebhook)
    shared/             Zod schemas and types shared by api, web, sdk
  brand/                Brand guidelines and visual assets
  docs/
    WORKFLOW.md         Core concept, app layout, end-to-end workflow, demo script
    PRD.md              Product requirements, scope, metrics, open questions
    TRD.md              Technical design: data model, API, security, tests, hosting
    OPEN_SOURCE.md      Approved open-source projects, licences, selection rules
    DESIGN.md           Design tokens and component system
  third_party/          Licences and attribution for third-party libraries
  AGENTS.md             Standing rules and truthfulness guidelines
```

## Prerequisites

- Node.js LTS (22+)
- pnpm 10+
- PostgreSQL 16+ (Docker recommended)

## How to run

1. Copy the environment file and fill in secrets:
   ```bash
   cp .env.example .env
   # Edit .env — generate SESSION_SECRET with: openssl rand -hex 32
   ```

2. Start PostgreSQL (Docker):
   ```bash
   docker compose up -d
   ```

3. Install dependencies:
   ```bash
   pnpm install
   ```

4. Run database migrations:
   ```bash
   pnpm --filter @himpaar/api exec prisma migrate deploy
   ```

5. Generate Prisma client:
   ```bash
   pnpm --filter @himpaar/api db:generate
   ```

6. Start development servers:
   ```bash
   pnpm dev
   ```
   - API: http://localhost:4000
   - Web: http://localhost:5173

## Testing

```bash
# All tests (API)
pnpm --filter @himpaar/api test

# Type checking (all packages)
pnpm --filter @himpaar/api exec tsc --noEmit
pnpm --filter @himpaar/web exec tsc --noEmit
pnpm --filter @himpaar/sdk exec tsc --noEmit
```

## SDK usage

```ts
import { HimpaarClient, verifyWebhook } from "@himpaar/sdk";

const himpaar = new HimpaarClient({
  apiKey: "hp_test_...",
  baseUrl: "http://localhost:4000",
});

// Create a payment link
const link = await himpaar.createPaymentLink(
  {
    amount: { amount_minor: "50000", currency: "USD" },
    description: "Project milestone 1",
    client_name: "Acme Inc",
    client_email: "billing@acme.com",
    due_date: "2026-11-01",
  },
  "idem-key-unique-per-request",
);

// Verify incoming webhook signature
await verifyWebhook({
  secret: "whsec_...",
  headers: req.headers,
  body: rawBody,
});
```

## Architecture highlights

- **Double-entry ledger**: pgledger (PostgreSQL) with 5 transfers per payment — receipt, fee, FX out, FX in, settlement. Insert-only, append-only corrections.
- **Webhook delivery**: Standard Webhooks signing, background worker with 5-attempt retry (1m, 5m, 30m, 2h), FOR UPDATE SKIP LOCKED concurrency.
- **Security**: Argon2 passwords, SHA-256 session tokens, CSRF origin check, per-route rate limits, insert-only audit log.
- **Nepal dates**: BS calendar conversion via `nepali-date-library`, fiscal year labels anchored to Shrawan 1.
- **All amounts**: BigInt minor units (cents/paisa). No floating point anywhere.

## Rules and Compliance

Every figure about tax, fees, licences, rates or NRB rules is **simulated / unverified** until an accountant, the bank, or an official NRB/IRD document confirms it.
