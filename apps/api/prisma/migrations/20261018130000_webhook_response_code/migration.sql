-- Add response_code column for webhook worker to store HTTP status
ALTER TABLE "webhook_deliveries" ADD COLUMN "response_code" INTEGER;
