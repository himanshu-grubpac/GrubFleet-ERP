DROP TABLE IF EXISTS "organisation_suppliers" CASCADE;--> statement-breakpoint
DROP TYPE IF EXISTS "public"."organisation_supplier_type";--> statement-breakpoint
CREATE TYPE "public"."organisation_supplier_type" AS ENUM('bike', 'driver', 'spare_parts', 'compliance');--> statement-breakpoint
CREATE TABLE "organisation_suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"supplier_type" "organisation_supplier_type" NOT NULL,
	"contact_person" varchar(255) NOT NULL,
	"contact_phone" varchar(32) NOT NULL,
	"contact_email" varchar(320) NOT NULL,
	"agreement_reference" varchar(120),
	"address_line1" varchar(255) NOT NULL,
	"address_line2" varchar(255),
	"address_city" varchar(120),
	"address_state" varchar(120),
	"address_district" varchar(120),
	"address_pincode" varchar(20),
	"address_country" varchar(2) DEFAULT 'IN' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_flagged" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "organisation_suppliers_organization_id_idx" ON "organisation_suppliers" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "organisation_suppliers_org_active_idx" ON "organisation_suppliers" USING btree ("organization_id","is_active");--> statement-breakpoint
CREATE INDEX "organisation_suppliers_org_type_idx" ON "organisation_suppliers" USING btree ("organization_id","supplier_type");--> statement-breakpoint
CREATE INDEX "organisation_suppliers_name_idx" ON "organisation_suppliers" USING btree ("organization_id","name");
