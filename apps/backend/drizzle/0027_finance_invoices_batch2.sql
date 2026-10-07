DO $$ BEGIN
  ALTER TYPE "finance_purchase_line_kind" ADD VALUE 'sale_vehicle';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "finance_purchase_line_kind" ADD VALUE 'billing_lease';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "finance_invoices" ADD COLUMN IF NOT EXISTS "amount_paid_minor" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "finance_invoices" ADD COLUMN IF NOT EXISTS "party_email" varchar(320);
ALTER TABLE "finance_invoices" ADD COLUMN IF NOT EXISTS "client_id" uuid;
ALTER TABLE "finance_invoices" ADD COLUMN IF NOT EXISTS "lease_contract_id" uuid;
ALTER TABLE "finance_invoices" ADD COLUMN IF NOT EXISTS "billing_period" varchar(120);
ALTER TABLE "finance_invoices" ADD COLUMN IF NOT EXISTS "cancel_reason" text;
ALTER TABLE "finance_invoices" ADD COLUMN IF NOT EXISTS "sale_auto_email_requested" boolean DEFAULT false NOT NULL;

CREATE INDEX IF NOT EXISTS "finance_invoices_client_id_idx" ON "finance_invoices" ("client_id");
CREATE INDEX IF NOT EXISTS "finance_invoices_lease_contract_id_idx" ON "finance_invoices" ("lease_contract_id");

DO $$ BEGIN
  ALTER TABLE "finance_invoices" ADD CONSTRAINT "finance_invoices_client_id_organisation_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."organisation_clients"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "finance_invoices" ADD CONSTRAINT "finance_invoices_lease_contract_id_lease_contracts_id_fk" FOREIGN KEY ("lease_contract_id") REFERENCES "public"."lease_contracts"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "finance_invoice_lines" ADD COLUMN IF NOT EXISTS "vehicle_id" uuid;

CREATE INDEX IF NOT EXISTS "finance_invoice_lines_vehicle_id_idx" ON "finance_invoice_lines" ("vehicle_id");

DO $$ BEGIN
  ALTER TABLE "finance_invoice_lines" ADD CONSTRAINT "finance_invoice_lines_vehicle_id_asset_register_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."asset_register_vehicles"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "finance_invoice_payments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "invoice_id" uuid NOT NULL,
  "organization_id" uuid NOT NULL,
  "amount_minor" bigint NOT NULL,
  "payment_date" date NOT NULL,
  "payment_method" varchar(64),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "finance_invoice_payments_invoice_id_idx" ON "finance_invoice_payments" ("invoice_id");
CREATE INDEX IF NOT EXISTS "finance_invoice_payments_org_idx" ON "finance_invoice_payments" ("organization_id");

DO $$ BEGIN
  ALTER TABLE "finance_invoice_payments" ADD CONSTRAINT "finance_invoice_payments_invoice_id_finance_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."finance_invoices"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
