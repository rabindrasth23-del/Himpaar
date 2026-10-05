# Approved open source for the Himpaar MVP

Only projects checked in our research. Always read the repository's LICENSE file before adding anything. Pin versions.

## Use now

| Need | Project | Licence (as found) | Notes |
|---|---|---|---|
| Ledger | pgr0ss/pgledger | MIT | Entire ledger lives in PostgreSQL tables and functions, so ledger writes commit atomically with other writes. Small project: have the AI explain its SQL and test it. Keep licence in `third_party/pgledger/`. |
| Ledger prerequisite | scoville/pgsql-ulid (vendored inside pgledger repo) | BSD-3-Clause | ULID↔UUID helper SQL functions required by pgledger. Already vendored in pgledger's `vendor/` directory. Keep licence in `third_party/pgsql-ulid/`. |
| Webhook signing | Standard Webhooks (spec + official JS library) | MIT | HMAC-SHA256, timestamp replay protection, `webhook-id`, `webhook-timestamp`, `webhook-signature` headers. Do not hand-roll signing. |
| Bikram Sambat dates and fiscal years | SandipGhimire/Nepali-Date-Library-NodeJS — npm package: `nepali-date-library` | MIT | BS calendar data is published about a year ahead; add tests on key dates. |
| Core stack | Vite, React, React Router, TanStack Query, React Hook Form, Zod, Tailwind CSS v4, @tailwindcss/vite, shadcn/ui, Fastify, @fastify/type-provider-zod, @fastify/cookie, @fastify/cors, @fastify/rate-limit, @fastify/static, Prisma (^7), pdfkit, tsup, Vitest | Mostly MIT or Apache-2.0 | Mainstream. Confirm each LICENSE before adding. |
| Passwords | `@node-rs/argon2` (Rust-based, prebuilt binaries, no C++ compiler needed) | MIT | Primary choice. Same argon2id algorithm. Skip `argon2` npm package to avoid node-gyp build issues on Windows. |
| Icons | `lucide-react` | ISC | ISC is permissive (simplified BSD/MIT equivalent). Approved by founders. |

## Later, not in the MVP

| Need | Project | Licence | Notes |
|---|---|---|---|
| Real merchant KYC/KYB | Ballerine | Apache 2.0 core, some proprietary features | Self-hostable. Only after the bank or NRB defines requirements. Re-check the current licence. |
| Heavier ledger and reconciliation | Blnk | Apache-2.0 | Separate Go service. Only if pgledger is outgrown. |

## Reference only (read, do not run)

| Project | Licence | Why |
|---|---|---|
| Hyperswitch | Apache 2.0 | Has a dummy connector for test payments. Shows how a test-payment layer works. Built in Rust for card routing; too heavy for us. |

## Avoid
- **FinCore Engine:** BSL 1.1, not permissive.
- Tiny wrapper packages with few users for NRB rates or similar. Use NRB's published rates directly.
- Any package with no LICENSE file or a non-permissive licence (for example AGPL or BSL) unless the founders approve it in writing.

## Not found
No open-source project for Nepal export documents or FIRC-style paperwork turned up in our searches. We build that ourselves.

## Selection rules
1. LICENSE file says MIT, Apache-2.0, BSD or ISC.
2. Recent commits and real users.
3. A founder reads all code that touches money.
4. Versions pinned; lockfile committed.
5. No copy-pasted code from unknown sources. Copied open-source code keeps its licence and attribution in `third_party/`.
