ALTER TABLE "organisation_employees" ADD COLUMN IF NOT EXISTS "department" varchar(120);
--> statement-breakpoint
ALTER TABLE "organisation_employees" ADD COLUMN IF NOT EXISTS "branch_location_label" varchar(255);
