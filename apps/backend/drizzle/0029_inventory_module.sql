DO $$ BEGIN
  CREATE TYPE "public"."inventory_parts_request_status" AS ENUM('blocked', 'fulfilled', 'reserved', 'cancelled', 'lapsed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."inventory_parts_request_type" AS ENUM('internal', 'external');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "inventory_catalog_parts" ADD COLUMN IF NOT EXISTS "brand" varchar(255);
--> statement-breakpoint
ALTER TABLE "inventory_catalog_parts" ADD COLUMN IF NOT EXISTS "unit_of_measure" varchar(32) DEFAULT 'Each' NOT NULL;
--> statement-breakpoint
ALTER TABLE "inventory_catalog_parts" ADD COLUMN IF NOT EXISTS "reorder_threshold" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "inventory_catalog_parts" ADD COLUMN IF NOT EXISTS "retail_markup_percent" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "inventory_catalog_parts" ADD COLUMN IF NOT EXISTS "wholesale_markup_percent" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "inventory_catalog_parts" ADD COLUMN IF NOT EXISTS "compatible_asset_classes" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "inventory_catalog_parts" ADD COLUMN IF NOT EXISTS "deactivate_reason" text;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inventory_part_code_sequences" (
	"organization_id" uuid NOT NULL,
	"last_seq" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_part_code_sequences_org_uidx" ON "inventory_part_code_sequences" USING btree ("organization_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inventory_stock_receipt_sequences" (
	"organization_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"last_seq" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_stock_receipt_sequences_org_year_uidx" ON "inventory_stock_receipt_sequences" USING btree ("organization_id","year");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inventory_stock_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"receipt_number" varchar(32) NOT NULL,
	"part_id" uuid NOT NULL,
	"supplier_id" uuid,
	"location_id" uuid NOT NULL,
	"purchase_invoice_reference" varchar(255),
	"finance_invoice_id" uuid,
	"purchase_date" date NOT NULL,
	"expiry_date" date,
	"quantity_received" integer NOT NULL,
	"unit_cost_minor" bigint NOT NULL,
	"batch_lot_reference" varchar(120),
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"deactivate_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_stock_receipts_org_number_uidx" ON "inventory_stock_receipts" USING btree ("organization_id","receipt_number");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_stock_receipts_org_part_idx" ON "inventory_stock_receipts" USING btree ("organization_id","part_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_stock_receipts_org_location_idx" ON "inventory_stock_receipts" USING btree ("organization_id","location_id");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_stock_receipts" ADD CONSTRAINT "inventory_stock_receipts_part_id_inventory_catalog_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."inventory_catalog_parts"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_stock_receipts" ADD CONSTRAINT "inventory_stock_receipts_supplier_id_organisation_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."organisation_suppliers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_stock_receipts" ADD CONSTRAINT "inventory_stock_receipts_location_id_organisation_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."organisation_locations"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_stock_receipts" ADD CONSTRAINT "inventory_stock_receipts_finance_invoice_id_finance_invoices_id_fk" FOREIGN KEY ("finance_invoice_id") REFERENCES "public"."finance_invoices"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inventory_parts_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"request_number" varchar(32) NOT NULL,
	"work_order_ref" varchar(64) NOT NULL,
	"part_id" uuid NOT NULL,
	"location_id" uuid,
	"quantity_requested" integer NOT NULL,
	"request_type" "inventory_parts_request_type" DEFAULT 'internal' NOT NULL,
	"vehicle_ref" varchar(64),
	"status" "inventory_parts_request_status" DEFAULT 'blocked' NOT NULL,
	"compatibility_ok" boolean DEFAULT true NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_parts_requests_org_number_uidx" ON "inventory_parts_requests" USING btree ("organization_id","request_number");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_parts_requests_org_status_idx" ON "inventory_parts_requests" USING btree ("organization_id","status");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_parts_requests" ADD CONSTRAINT "inventory_parts_requests_part_id_inventory_catalog_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."inventory_catalog_parts"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_parts_requests" ADD CONSTRAINT "inventory_parts_requests_location_id_organisation_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."organisation_locations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
