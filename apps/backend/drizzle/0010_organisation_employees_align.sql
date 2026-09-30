ALTER TABLE "organisation_employees" ADD COLUMN IF NOT EXISTS "department" varchar(120);
--> statement-breakpoint
ALTER TABLE "organisation_employees" ADD COLUMN IF NOT EXISTS "branch_location_label" varchar(255);
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
