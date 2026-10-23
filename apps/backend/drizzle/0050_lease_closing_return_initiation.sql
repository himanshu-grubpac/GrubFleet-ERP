ALTER TYPE "public"."fleet_vehicle_status" ADD VALUE IF NOT EXISTS 'return_pending';

ALTER TABLE "lease_contracts" ADD COLUMN IF NOT EXISTS "closing_reason" varchar(32);
ALTER TABLE "lease_contracts" ADD COLUMN IF NOT EXISTS "closing_lease_end_date" timestamp with time zone;
ALTER TABLE "lease_contracts" ADD COLUMN IF NOT EXISTS "return_method" varchar(32);
ALTER TABLE "lease_contracts" ADD COLUMN IF NOT EXISTS "return_depot_location_id" uuid;
ALTER TABLE "lease_contracts" ADD COLUMN IF NOT EXISTS "return_depot_label" varchar(120);
ALTER TABLE "lease_contracts" ADD COLUMN IF NOT EXISTS "expected_return_by" timestamp with time zone;
ALTER TABLE "lease_contracts" ADD COLUMN IF NOT EXISTS "return_initiation_notes" text;
