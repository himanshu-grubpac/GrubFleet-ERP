ALTER TABLE "asset_register_vehicle_assignments" ADD COLUMN IF NOT EXISTS "handover_location" varchar(255);
--> statement-breakpoint
ALTER TABLE "asset_register_vehicle_assignments" ADD COLUMN IF NOT EXISTS "notes" varchar(2000);
