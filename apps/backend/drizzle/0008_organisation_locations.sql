CREATE TABLE IF NOT EXISTS "organisation_location_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"preset_key" varchar(64),
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "organisation_location_types_org_name_uidx" ON "organisation_location_types" USING btree ("organization_id","name");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "organisation_location_types_org_preset_uidx" ON "organisation_location_types" USING btree ("organization_id","preset_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organisation_location_types_organization_id_idx" ON "organisation_location_types" USING btree ("organization_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organisation_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"location_type_id" uuid NOT NULL,
	"address_line1" varchar(255) NOT NULL,
	"address_line2" varchar(255),
	"address_city" varchar(120),
	"address_state" varchar(120),
	"address_district" varchar(120),
	"address_pincode" varchar(20),
	"site_contact_phone" varchar(32),
	"site_contact_email" varchar(320),
	"responsible_employee_id" uuid,
	"deputy_employee_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organisation_locations_organization_id_idx" ON "organisation_locations" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organisation_locations_org_active_idx" ON "organisation_locations" USING btree ("organization_id","is_active");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organisation_locations_location_type_id_idx" ON "organisation_locations" USING btree ("location_type_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organisation_locations_name_idx" ON "organisation_locations" USING btree ("organization_id","name");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "organisation_locations" ADD CONSTRAINT "organisation_locations_location_type_id_organisation_location_types_id_fk" FOREIGN KEY ("location_type_id") REFERENCES "public"."organisation_location_types"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
