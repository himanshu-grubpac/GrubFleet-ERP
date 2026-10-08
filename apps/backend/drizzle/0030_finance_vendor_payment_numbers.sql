CREATE TABLE IF NOT EXISTS "finance_vendor_payment_number_sequences" (
  "organization_id" uuid NOT NULL,
  "year" integer NOT NULL,
  "last_seq" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "finance_vendor_payment_number_sequences_org_year_uidx" ON "finance_vendor_payment_number_sequences" USING btree ("organization_id","year");
--> statement-breakpoint
ALTER TABLE "finance_invoice_payments" ADD COLUMN IF NOT EXISTS "payment_number" varchar(32);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "finance_invoice_payments_org_payment_number_uidx" ON "finance_invoice_payments" USING btree ("organization_id","payment_number");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "finance_invoice_payments_payment_number_idx" ON "finance_invoice_payments" USING btree ("payment_number");
