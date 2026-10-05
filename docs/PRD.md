# Himpaar: Product Requirements Document (MVP)

Version 2, merged from the founders' research and Prince's draft v1. Status: nothing built. Items marked (verify) are unconfirmed.

## 1. Summary
Himpaar is a developer-first payment layer for Nepali IT exporters. A licensed partner bank holds funds and converts currency. Himpaar supplies payment links, settlement records, export documents, a dashboard and an SDK. This phase is a sandbox MVP with fake money.

## 2. Problem
Nepali IT companies, agencies and freelancers earn foreign currency but lack a unified, developer-first, export-focused way to receive it. Common routes are Payoneer (reported at about 2% for NPR conversion and up to about 4% on cards, verify) and SWIFT wires (no invoicing or reconciliation tools). Official IT services exports were about Rs22.33 billion, roughly $160 million, in 2024-25 (verify). Industry says the real figure is higher because much income bypasses formal channels.

Do not claim "nothing like this exists in Nepal." Licensed payment providers already advertise international card acceptance (verify). The accurate claim is that no unified, developer-first, export-focused option is known to the founders.

## 3. Users
- **Primary:** Nepali IT companies, agencies and freelancers with foreign clients.
- **Later:** other service exporters, institutions, government.
- **Economic buyer:** whoever reconciles foreign receipts and files export paperwork today.

## 4. Goals and non-goals (this phase)
**Goals:** (1) 10 documented interviews with Nepali IT exporters. (2) Written terms from a partner bank. (3) A working sandbox demo and a 2-minute video. (4) A YC application before the deadline, reported as November 2, 2026, 8pm PT, Winter 2027 batch (confirm at ycombinator.com/apply). (5) Three to five letters of intent from companies.
**Non-goals:** real money, tax filing, other countries, real cards or USD settlement, eSewa/Khalti integration, an admin back office.

## 5. Scope
| Feature | Priority | Notes |
|---|---|---|
| Sign-up, login, simulated KYC | P0 | Nothing verified |
| Test API keys | P0 | Shown once, hashed |
| Payment links / invoices | P0 | USD only in MVP |
| Payer page with simulated outcomes | P0 | Success, decline, pending |
| Simulated NPR settlement | P0 | Labeled fixed rate |
| Export document (PDF + JSON) | P0 | "Settlement Advice (simulated)" |
| Dashboard | P0 | Payments, settlements, documents |
| Webhooks | P0 | Standard Webhooks signing |
| SDK (TypeScript) | P0 | create link, verifyWebhook |
| Sandbox demo controls | P0 | For the video |
| Cards, USD settlement | Roadmap | Needs bank partner |
| Annual tax statements | Roadmap | After documents work |
| Tax filing | Roadmap | With accounting partners; do not claim |
| Invoice financing | Later | Needs capital and risk control |

## 6. User stories and acceptance criteria
1. **Create a link in under a minute.** Given a logged-in merchant, when they submit amount, description and client, then a unique link is returned and appears in the list.
2. **Pay without a Nepali bank account (simulated).** Given an open link, the payer can choose a method and trigger an outcome; no card data is collected.
3. **Automatic settlement and document.** On success, a settlement record and a document exist within seconds, linked to the payment.
4. **One dashboard.** The merchant sees payments, settlements and documents with correct statuses.
5. **Integrate in an afternoon.** A developer can create a link and verify a webhook with the SDK using the quick-start snippet.
6. **Safe retries.** Repeating a request with the same Idempotency-Key creates no duplicate record.
7. **Accountant view (roadmap).** Annual statement. Static page only.

## 7. Functional requirements
FR-1 Authentication with hashed passwords and server-side sessions. FR-2 Simulated KYC record per merchant. FR-3 API key create/list/revoke. FR-4 Payment link create/list/get, expiry. FR-5 Public payer page and sandbox-only simulate endpoint. FR-6 Signed internal bank events verified before any state change. FR-7 Payment, settlement and link state machines. FR-8 Append-only ledger for receipt, conversion, fee. FR-9 Settlement with integer arithmetic and documented rounding. FR-10 Export document with BS and AD dates and Nepali fiscal year. FR-11 Webhook endpoints, signed deliveries, retries, redeliver. FR-12 Dashboard screens listed in `WORKFLOW.md`. FR-13 Security audit log. FR-14 Static roadmap page.

## 8. Non-functional requirements
Correctness first: every money path tested. Security per `AGENTS.md`. Every simulated value labeled. Free-tier hosting is acceptable only because data is fake. Demo must work on a cold start (wake the API before demos).

## 9. Compliance and NRB alignment
- **Two sandboxes.** Our MVP sandbox is fake money. NRB's Regulatory Sandbox is supervised testing with real merchants and comes later.
- **NRB sandbox facts found** (verify against the official guidelines on NRB's Payment Systems Department page): guidelines in effect since May 14, 2026. Unlicensed fintechs may join but must partner with an authorized financial institution before testing and meet fit-and-proper criteria. Contribution to financial inclusion is a key selection factor. Testable areas include APIs, retail payments, remittance and digital KYC. New fintechs still need formal licences afterward.
- **Our alignment plan:** written bank partner; honest financial-inclusion case (small exporters and freelancers moving from informal routes to licensed bank channels with records; confirm with NRB whether this qualifies); simulated KYC and audit logs now, real KYC per bank/NRB rules later; ask NRB how fit-and-proper applies to student founders.
- **Grey list.** Nepal remained on the FATF grey list after June 2026; the September 2026 review outcome was not found (verify). Expect strict AML expectations from banks.
- We cannot promise acceptance into any sandbox. NRB decides.

## 10. Success metrics
10 of 10 interviews documented. Written bank terms from at least one bank. Working sandbox demo and video. Three to five letters of intent. YC application submitted before the deadline.

## 11. Open questions and unverified items
1. Nabil's fees, settlement times, document process and revenue share. None known.
2. Whether a platform-generated document is accepted for export proof in Nepal. Unknown.
3. Whether collecting funds on a merchant's behalf needs Himpaar's own licence. Ask a lawyer.
4. Tax: VAT zero-rating of export services, 5% final withholding for freelancers receiving through banks, income tax rebate (75% versus 50% in sources). All from secondary sources.
5. NRB licence capital figures (NPR 25M aggregator, NPR 50M gateway). From the founders' report and a law-firm summary only.
6. Official NRB rate access terms for automated use.
7. Real size of unrecorded IT income.
8. Whether Pakistan or Bangladesh claims in Prince's draft hold (Pakistan FY26 totals were checked: IT exports $4.6B and freelancer earnings $1.76B; the PayPal history, the 0.25% incentive, the 50% USD-retention rule and all Bangladesh figures were not).

## 12. Appendix: changes from Prince's draft v1
1. Unverified Pakistan/Bangladesh claims marked or removed. 2. "Nepal's equivalent of eFIRA" replaced with "Settlement Advice (simulated)". 3. "Himpaar does not hold money" listed as a legal question. 4. Pakistan/Bangladesh modules cut to one `CountryRules` interface. 5. Added simulated KYC and AML audit logging. 6. Added week-by-week plan, SDK language decision (TypeScript), simulated FX source, and testing detail. 7. Competitor claims (for example PayPal account freezing) need a source before public use.
