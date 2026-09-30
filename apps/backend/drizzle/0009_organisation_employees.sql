DO $$ BEGIN
 CREATE TYPE "public"."organisation_employment_type" AS ENUM('full_time', 'part_time', 'contract');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organisation_employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"designation" varchar(255),
	"department" varchar(120),
	"branch_location_label" varchar(255),
	"location_id" uuid,
	"reports_to_employee_id" uuid,
	"employment_type" "organisation_employment_type" DEFAULT 'full_time' NOT NULL,
	"date_of_joining" date,
	"phone" varchar(32),
	"email" varchar(320),
	"is_active" boolean DEFAULT true NOT NULL,
	"deactivate_reason_type" varchar(32),
	"deactivate_comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organisation_employees_organization_id_idx" ON "organisation_employees" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organisation_employees_org_active_idx" ON "organisation_employees" USING btree ("organization_id","is_active");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organisation_employees_full_name_idx" ON "organisation_employees" USING btree ("organization_id","full_name");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "organisation_employees" ADD CONSTRAINT "organisation_employees_location_id_organisation_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."organisation_locations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "organisation_employees" ADD CONSTRAINT "organisation_employees_reports_to_organisation_employees_id_fk" FOREIGN KEY ("reports_to_employee_id") REFERENCES "public"."organisation_employees"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "organisation_locations" ADD CONSTRAINT "organisation_locations_responsible_employee_id_organisation_employees_id_fk" FOREIGN KEY ("responsible_employee_id") REFERENCES "public"."organisation_employees"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "organisation_locations" ADD CONSTRAINT "organisation_locations_deputy_employee_id_organisation_employees_id_fk" FOREIGN KEY ("deputy_employee_id") REFERENCES "public"."organisation_employees"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
