ALTER TABLE "fleet_return_inspections" ADD COLUMN IF NOT EXISTS "inspection_status" varchar(24) NOT NULL DEFAULT 'not_started';
ALTER TABLE "fleet_return_inspections" ADD COLUMN IF NOT EXISTS "inspection_worksheet" jsonb;
ALTER TABLE "fleet_return_inspections" ADD COLUMN IF NOT EXISTS "inspection_summary" jsonb;
ALTER TABLE "fleet_return_inspections" ADD COLUMN IF NOT EXISTS "inspection_completed_at" timestamp with time zone;
ALTER TABLE "fleet_return_inspections" ADD COLUMN IF NOT EXISTS "inspected_by_user_id" uuid;
ALTER TABLE "fleet_return_inspections" ADD COLUMN IF NOT EXISTS "inspection_last_saved_at" timestamp with time zone;
