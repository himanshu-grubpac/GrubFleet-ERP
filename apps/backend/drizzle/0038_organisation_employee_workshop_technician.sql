ALTER TABLE "organisation_employees" ADD COLUMN IF NOT EXISTS "is_workshop_technician" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organisation_employees_org_workshop_technician_idx" ON "organisation_employees" ("organization_id", "is_workshop_technician");
