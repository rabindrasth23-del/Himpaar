# Himpaar: core concept, app layout and workflow

## 1. Core concept (plain words)

Nepali IT companies, agencies and freelancers earn money from foreign clients. Getting that money into Nepal through a bank is slow, paperwork-heavy or expensive, so much of it goes through other routes and never shows up properly.

Himpaar is the software layer that makes the proper route easy. The company sends a payment link. The foreign client pays. A **licensed partner bank** holds and converts the money. The company receives NPR and a clean settlement record and document. Himpaar does not hold money and is not the bank.

Three parties:
- **Merchant:** the Nepali company or freelancer. Uses the dashboard.
- **Payer:** the foreign client. Uses the payment page.
- **Developer:** the merchant's engineer. Uses the API and SDK.

A fourth party, the **partner bank**, is not connected in the MVP. A built-in simulator plays its role.

## 2. Real versus simulated in the MVP

| Piece | MVP status |
|---|---|
| Dashboard, payment page, API, SDK, database, ledger | Real software |
| Foreign payment (card/ACH/SEPA/SWIFT) | Simulated. No card data collected |
| Partner bank, currency conversion, settlement | Simulated, with a labeled fixed rate |
| Merchant KYC | Simulated form. Nothing is verified |
| Export document | Generated, but titled "Himpaar Settlement Advice (simulated)" |
| Tax rates, fees, FX rate | Placeholders marked `UNVERIFIED_` |

## 3. End-to-end workflow

1. **Sign up and log in.** The merchant creates an account.
2. **Simulated KYC.** The merchant enters company name, registration number and PAN/VAT (placeholder fields). Sandbox status becomes "approved (sandbox)". Nothing is checked.
3. **Test API key.** The merchant creates a `hp_test_...` key. It is shown once.
4. **Create a payment link.** Amount (USD), description, client name and email, due date. The API returns a link like `/pay/<token>`.
5. **Payer opens the link.** Sees the invoice and a clear "Test mode" banner. Chooses a method (Card, ACH, SEPA or SWIFT, all simulated).
6. **Simulate the outcome.** In sandbox the payer page offers Success, Decline or Pending. The simulator emits a **signed bank event** to the API.
7. **API verifies the event.** Signature and timestamp are checked. The event is deduplicated. The payment moves to `succeeded` or `failed`.
8. **Ledger entries are written.** The USD receipt, then the simulated conversion and fee, each as append-only ledger transfers.
9. **Settlement is created.** NPR net amount = (gross USD − fee USD) × simulated rate. The fee is always in the same currency as the gross; never subtract a fee in a different currency. Status `pending`, then `settled`.
10. **Export document is generated.** PDF + JSON with BS and AD dates and the Nepali fiscal year.
11. **Webhooks fire** to the merchant's endpoint (`payment.succeeded`, `settlement.settled`, `document.created`), signed with Standard Webhooks.
12. **Dashboard updates.** The merchant sees the payment, settlement and document, and can download the PDF.

## 4. App layout

### Payer page (`/pay/:token`)

```
+--------------------------------------------------------+
| TEST MODE: simulated payment, no real money            |
+--------------------------------------------------------+
| Invoice from: [Merchant name]                          |
| Ref: INV-0001                    Due: 2026-11-15       |
| Description: Website development, October             |
|                                                        |
| Amount due                             USD 1,000.00    |
|                                                        |
| Pay with: (o) Card  ( ) ACH  ( ) SEPA  ( ) SWIFT       |
| Simulated. No card data is collected.                  |
|                                                        |
| [ Simulate: success ] [ Decline ] [ Pending ]          |
+--------------------------------------------------------+
```

### Dashboard shell

```
+-----------+------------------------------------------------+
| Himpaar   | [TEST MODE]                    Company name    |
+-----------+------------------------------------------------+
| Overview  |                                                |
| Links     |           (screen content here)                |
| Payments  |                                                |
| Settlemts |                                                |
| Documents |                                                |
| Developers|                                                |
| Sandbox   |                                                |
| Roadmap   |                                                |
+-----------+------------------------------------------------+
```

### Screens

1. **Sign up / log in.**
2. **KYC (simulated).** Company details form with a "not verified" notice.
3. **Overview.** Totals (USD received, NPR settled), recent payments, pending settlements.
4. **Payment links.** List, create form, detail with copyable URL.
5. **Payments.** List and detail with a timeline (created, pending, succeeded or failed).
6. **Settlements.** List and detail: gross USD, fee, rate (labeled simulated), NPR net, status.
7. **Documents.** List, preview, download PDF and JSON.
8. **Developers.** API keys (create, revoke), webhook endpoints, delivery log with redeliver, quick-start code using the SDK.
9. **Sandbox controls.** Choose an outcome, replay a duplicate webhook to show idempotency, advance a settlement.
10. **Roadmap.** Static page: real cards/USD settlement, annual statements, tax filing, invoice financing. Marked "not built".

## 5. Status flows

- Payment link: `open -> paid | expired | cancelled`
- Payment: `created -> pending | expired`; `pending -> succeeded | failed | expired`. Terminal: `succeeded`, `failed`, `expired`.
  - Expiry: a payment link past its `expires_at` expires any `created` payment (checked on read and on pay attempts, no cron). A payment stuck in `pending` for over 30 minutes expires. A `succeeded` payment never becomes `expired`.
- Settlement: `pending -> settled | failed`
- Document: `generated`
- Webhook delivery: `pending -> delivered | failed (retry) -> dead`


## 6. Two-minute demo script (for the YC video and the bank)

- 0:00 to 0:15: the problem in one sentence. Nepali IT firms earn from foreign clients, but the proper route is slow and paperwork-heavy.
- 0:15 to 0:35: log in, create a payment link for USD 1,000.
- 0:35 to 1:00: open the link as the foreign client, choose a method, click "Simulate: success".
- 1:00 to 1:20: back on the dashboard, show the payment, ledger-backed settlement and NPR amount.
- 1:20 to 1:40: open the export document. Point out BS and AD dates and the simulated label.
- 1:40 to 1:55: show the webhook delivery and the three-line SDK snippet.
- 1:55 to 2:00: "Everything here is sandbox. Next: a licensed bank partner and real merchants."

Say "simulated" out loud. Never describe it as live.
