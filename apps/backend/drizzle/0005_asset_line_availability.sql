ALTER TYPE "public"."fleet_vehicle_status" ADD VALUE IF NOT EXISTS 'inbound';
--> statement-breakpoint
ALTER TABLE "lease_contract_asset_lines" ADD COLUMN "availability_status" varchar(32) DEFAULT 'covered' NOT NULL;
--> statement-breakpoint
ALTER TABLE "lease_contract_asset_lines" ADD COLUMN "available_now_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "lease_contract_asset_lines" ADD COLUMN "inbound_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "lease_contract_asset_lines" ADD COLUMN "shortfall_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "lease_contract_asset_lines" ADD COLUMN "awaiting_assets_line" boolean DEFAULT false NOT NULL;
