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

## How to run

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Start development servers:
   ```bash
   pnpm dev
   ```

## Rules and Compliance

Every figure about tax, fees, licences, rates or NRB rules is **simulated / unverified** until an accountant, the bank, or an official NRB/IRD document confirms it.
