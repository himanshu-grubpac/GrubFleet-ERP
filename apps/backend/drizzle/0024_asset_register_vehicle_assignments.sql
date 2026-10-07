CREATE TABLE IF NOT EXISTS "asset_register_vehicle_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"lease_contract_id" uuid NOT NULL,
	"fleet_client_id" uuid,
	"organisation_client_id" uuid,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"unassigned_at" timestamp with time zone
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "asset_register_vehicle_assignments" ADD CONSTRAINT "asset_register_vehicle_assignments_vehicle_id_asset_register_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."asset_register_vehicles"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "asset_register_vehicle_assignments" ADD CONSTRAINT "asset_register_vehicle_assignments_lease_contract_id_lease_contracts_id_fk" FOREIGN KEY ("lease_contract_id") REFERENCES "public"."lease_contracts"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "asset_register_vehicle_assignments_active_vehicle_uidx" ON "asset_register_vehicle_assignments" ("vehicle_id") WHERE "unassigned_at" IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_register_vehicle_assignments_organization_id_idx" ON "asset_register_vehicle_assignments" ("organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_register_vehicle_assignments_lease_contract_id_idx" ON "asset_register_vehicle_assignments" ("lease_contract_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_register_vehicle_assignments_vehicle_id_idx" ON "asset_register_vehicle_assignments" ("vehicle_id");
