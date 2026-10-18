-- Additive only: persist user-entered API key labels and payment-link client details.
ALTER TABLE "api_keys" ADD COLUMN "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "payment_links" ADD COLUMN "client_name" TEXT;
ALTER TABLE "payment_links" ADD COLUMN "client_email" TEXT;
