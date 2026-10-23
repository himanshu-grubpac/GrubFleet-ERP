ALTER TABLE "asset_register_vehicles" ADD COLUMN IF NOT EXISTS "insurance_policy_number" varchar(128);
--> statement-breakpoint
ALTER TABLE "asset_register_vehicles" ADD COLUMN IF NOT EXISTS "registration_reference" varchar(128);
