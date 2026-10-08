# Setup prompts for Antigravity (paste one at a time)

Run Prompt 0 first, review the answer, then Prompts 1 to 6 in order. After each prompt, you and Prince run the commands yourselves and read what changed.

**Rules that apply to every prompt below (the prompts repeat the key ones):**

- Confirm package names and APIs from the npm registry or official docs. Never guess.
- Show every command before running it. If a command fails, show the error and propose a fix; do not skip steps.
- No global installs unless unavoidable. No secrets in files.
- Commit after each prompt with a clear message.

---

## Prompt 0: Orientation (no code)

```
Read AGENTS.md, then docs/WORKFLOW.md, docs/PRD.md, docs/TRD.md and docs/OPEN_SOURCE.md in full.
The project is named Himpaar. It was renamed from an older name, so tell me if you find any leftover old-name text.
Do not write code and do not install anything yet.
Reply with:
1. A summary of what we are building, in 8 lines, in your own words.
2. Anything unclear, missing, or contradictory across the files.
3. Every package you plan to use, with: confirmed on the npm registry (yes/no), latest stable version, and licence.
4. Anything in the documents you believe is wrong or risky.
Mark anything you cannot verify as UNVERIFIED. Then stop and wait for my approval.
```

## Prompt 1: Monorepo scaffold

```
Follow AGENTS.md. Create the pnpm workspace monorepo for Himpaar.
Create: apps/api, apps/web, packages/sdk, packages/shared, third_party/, and the root files below.
Root files: package.json (private, scripts: typecheck, lint, test, build, dev), pnpm-workspace.yaml, tsconfig.base.json (strict true), .gitignore (including .env), .env.example, .editorconfig, eslint config, prettier config.
Use the current Node LTS. Check that pnpm is available (via corepack or install notes) and tell me what you find.
Name packages @himpaar/api, @himpaar/web, @himpaar/sdk, @himpaar/shared.
Do not add application code yet. Show the folder tree, the commands you ran, and the output of pnpm install, pnpm typecheck and pnpm lint.
```

## Prompt 2: Backend setup

```
Follow AGENTS.md and docs/TRD.md. Set up apps/api only.
1. Install and confirm each package on the npm registry before installing:
   dependencies: fastify, @fastify/cookie, @fastify/cors, @fastify/rate-limit, @fastify/type-provider-zod, zod, @prisma/client, argon2, pdfkit, standardwebhooks, and the Bikram Sambat library chosen in docs/OPEN_SOURCE.md (confirm its exact npm name from its README).
   devDependencies: typescript, tsx, prisma, vitest, @types/node, @types/pdfkit.
   Use: pnpm --filter @himpaar/api add <package>. Pin exact versions. Tell me any package you could not confirm.
   If argon2 fails to build on Windows, show me the error and use the approved fallback @node-rs/argon2 from docs/OPEN_SOURCE.md.
2. Create a Fastify app skeleton: src/app.ts (build function, no listen), src/server.ts (listen), src/config/env.ts (validate all environment variables with Zod, fail fast), src/routes/health.ts (GET /health), src/compliance/nepal.config.ts (UNVERIFIED_ constants only, each with a comment on who must confirm it).
3. Configure pino logging with secret redaction.
4. Add scripts: dev, build, start, test, typecheck.
5. Add one Vitest test that calls GET /health using Fastify inject.
Do not build payment logic yet. Show commands, the file list, and real output of pnpm --filter @himpaar/api typecheck and test.
```

## Prompt 3: Database and ledger

```
Follow AGENTS.md and docs/TRD.md sections 4 and 5.
1. Create docker-compose.yml at the repo root with the official PostgreSQL image (use the current stable major; tell me which and why). If Docker is not installed on my machine, tell me and offer the fallback of a free Neon connection string in .env.
2. Initialize Prisma in apps/api, following the current official Prisma docs for the version we installed, not memory. Write the first-pass schema from TRD section 4 (BIGINT for all money, currency columns, CHECK constraints for positive amounts, foreign keys, timestamps).
3. Fetch pgledger from its GitHub repository (pgr0ss/pgledger), read its README and SQL, and tell me its real function names and constraints. Do not guess them.
4. Before step 5, tell me how BankEvent.processed_at can work if BankEvent is append-only. Propose one fix: a separate table or row for "processed", or blocking only DELETE and payload changes.
5. PRESENT a ledger account design (accounts, transfers per payment, fee, conversion) for my approval. STOP and wait before writing any ledger migration.
6. After I approve: add pgledger as a raw SQL migration, copy its LICENSE into third_party/pgledger/ with attribution, and add database-level protection so ledger rows cannot be updated or deleted.
7. After adding pgledger, run "prisma migrate dev" again and prove the ledger tables survive. If they do not, put pgledger in its own Postgres schema and propose that.
8. Run the migrations and show the output. Write tests that prove an UPDATE and a DELETE on the ledger fail.
Show commands and real output at each step.
```

## Prompt 4: Frontend setup

```
Follow AGENTS.md and docs/WORKFLOW.md. Set up apps/web only.
1. Create a Vite + React + TypeScript app in apps/web. Confirm packages on npm before installing:
   dependencies: react, react-dom, react-router, @tanstack/react-query, react-hook-form, @hookform/resolvers, zod, lucide-react.
   devDependencies: vite, @vitejs/plugin-react, typescript, vitest, @testing-library/react, jsdom.
2. Install Tailwind CSS by following the CURRENT official Tailwind installation guide for Vite. Tell me which guide and version you used. Do not rely on memory.
3. Initialize shadcn/ui using its official CLI and current docs. Add only: button, input, label, card, table, badge, dialog.
4. Build only the layout shell and route stubs from docs/WORKFLOW.md section 4: the dashboard shell (sidebar, top bar with a clear TEST MODE banner) and empty pages for Overview, Payment links, Payments, Settlements, Documents, Developers, Sandbox, Roadmap, plus the public /pay/:token page with the TEST MODE banner.
5. Add an API client module that reads API_URL from environment variables. No payment logic yet.
Show commands, the folder tree, and real output of pnpm --filter @himpaar/web typecheck, lint and test, plus a screenshot or a description of the running shell.
```

## Prompt 5: Shared package and SDK

```
Follow AGENTS.md and docs/TRD.md.
1. packages/shared: add zod. Create Zod schemas and inferred types for: money (integer minor units plus currency), payment link create request/response, payment, settlement, document, webhook event envelope, and the standard error shape. Export them.
2. packages/sdk: set up tsup and TypeScript, depend on @himpaar/shared and standardwebhooks (confirm both). Create a Himpaar client with a constructor taking an API key and base URL, a createPaymentLink method that automatically sends an Idempotency-Key header, and a verifyWebhook function that wraps the standardwebhooks library using the raw body and headers. Do not write your own signature code.
3. Write Vitest tests: verifyWebhook accepts a valid signature, rejects a bad signature, rejects an old timestamp.
4. Add a README in packages/sdk with a three-line quick-start example.
Show commands and real test output.
```

## Prompt 6: Setup verification (before any feature work)

```
Run a full check and report honestly. Do not fix anything silently.
1. From a clean state: delete node_modules, run pnpm install, then pnpm typecheck, pnpm lint, pnpm test, pnpm build. Paste the real output.
2. List every dependency installed in each package with its version and licence. Flag anything that is not MIT, Apache-2.0 or BSD.
3. Confirm no secrets are in the repository and that .env is ignored.
4. Search the whole repository case-insensitively for the old name "virqo" and "vq_" and show me the result. It must be empty.
5. List every item in the code or docs still marked UNVERIFIED or PENDING.
6. Run pnpm audit and report the results.
7. Tell me what is NOT yet working or tested.
Then stop. Do not start building features until I approve.
```

---

## After setup: first feature prompt (Week 1)

```
Follow AGENTS.md. Build, in this order, with tests for each and a short plan first:
(a) signup, login, logout, sessions, CSRF protection; (b) simulated KYC record; (c) API key create, list, revoke (show once, store prefix and SHA-256 hash only);
(d) payment link create with Idempotency-Key, list, get; (e) the dashboard screens for (a) to (d).
Ask me before deciding anything about money. Stop after each numbered item for my review.
```
