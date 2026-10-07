DO $$ BEGIN
  CREATE TYPE "finance_invoice_type" AS ENUM('purchase', 'sale', 'billing');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "finance_invoice_status" AS ENUM('unpaid', 'partially_paid', 'paid', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "finance_purchase_line_kind" AS ENUM('vehicle', 'spare_parts');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "inventory_catalog_parts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "name" varchar(255) NOT NULL,
  "part_code" varchar(64),
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_catalog_parts_org_name_uidx" ON "inventory_catalog_parts" ("organization_id", "name");
CREATE INDEX IF NOT EXISTS "inventory_catalog_parts_org_active_idx" ON "inventory_catalog_parts" ("organization_id", "is_active");

CREATE TABLE IF NOT EXISTS "finance_invoice_number_sequences" (
  "organization_id" uuid NOT NULL,
  "year" integer NOT NULL,
  "last_seq" integer DEFAULT 0 NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "finance_invoice_number_sequences_org_year_uidx" ON "finance_invoice_number_sequences" ("organization_id", "year");

CREATE TABLE IF NOT EXISTS "finance_invoices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "invoice_number" varchar(32) NOT NULL,
  "invoice_type" "finance_invoice_type" NOT NULL,
  "status" "finance_invoice_status" DEFAULT 'unpaid' NOT NULL,
  "supplier_id" uuid,
  "party_name" varchar(255) NOT NULL,
  "description" varchar(500) NOT NULL,
  "total_amount_minor" bigint NOT NULL,
  "invoice_date" date NOT NULL,
  "notes" text,
  "purchase_line_kind" "finance_purchase_line_kind",
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "finance_invoices_org_number_uidx" ON "finance_invoices" ("organization_id", "invoice_number");
CREATE INDEX IF NOT EXISTS "finance_invoices_org_type_idx" ON "finance_invoices" ("organization_id", "invoice_type");
CREATE INDEX IF NOT EXISTS "finance_invoices_org_status_idx" ON "finance_invoices" ("organization_id", "status");
CREATE INDEX IF NOT EXISTS "finance_invoices_org_date_idx" ON "finance_invoices" ("organization_id", "invoice_date");
CREATE INDEX IF NOT EXISTS "finance_invoices_supplier_id_idx" ON "finance_invoices" ("supplier_id");

DO $$ BEGIN
  ALTER TABLE "finance_invoices" ADD CONSTRAINT "finance_invoices_supplier_id_organisation_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."organisation_suppliers"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "finance_invoice_lines" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "invoice_id" uuid NOT NULL,
  "line_kind" "finance_purchase_line_kind" NOT NULL,
  "asset_class_name" varchar(120),
  "inventory_part_id" uuid,
  "quantity" integer DEFAULT 1 NOT NULL,
  "unit_cost_minor" bigint,
  "line_amount_minor" bigint NOT NULL,
  "batch_lot" varchar(120),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "finance_invoice_lines_invoice_id_idx" ON "finance_invoice_lines" ("invoice_id");

DO $$ BEGIN
  ALTER TABLE "finance_invoice_lines" ADD CONSTRAINT "finance_invoice_lines_invoice_id_finance_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."finance_invoices"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "finance_invoice_lines" ADD CONSTRAINT "finance_invoice_lines_inventory_part_id_inventory_catalog_parts_id_fk" FOREIGN KEY ("inventory_part_id") REFERENCES "public"."inventory_catalog_parts"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
