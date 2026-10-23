ALTER TABLE "fleet_return_inspections" ADD COLUMN IF NOT EXISTS "workshop_repair_closed_at" timestamp with time zone;
ALTER TABLE "fleet_return_inspections" ADD COLUMN IF NOT EXISTS "re_inspection_status" varchar(24) NOT NULL DEFAULT 'not_started';
ALTER TABLE "fleet_return_inspections" ADD COLUMN IF NOT EXISTS "re_inspection_worksheet" jsonb;
ALTER TABLE "fleet_return_inspections" ADD COLUMN IF NOT EXISTS "re_inspection_completed_at" timestamp with time zone;
