CREATE TYPE "public"."asset_register_vehicle_operational_status" AS ENUM('available', 'leased', 'workshop', 'sold', 'retired');--> statement-breakpoint
CREATE TABLE "asset_register_fleet_code_counters" (
	"organization_id" uuid PRIMARY KEY NOT NULL,
	"next_sequence" integer DEFAULT 1001 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset_register_vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"asset_class_id" uuid NOT NULL,
	"asset_master_id" uuid NOT NULL,
	"fleet_code" varchar(32) NOT NULL,
	"registration_number" varchar(32) NOT NULL,
	"chassis_number" varchar(64) NOT NULL,
	"model_year" integer NOT NULL,
	"odometer" integer DEFAULT 0 NOT NULL,
	"registration_start_date" date NOT NULL,
	"registration_end_date" date NOT NULL,
	"insurance_start_date" date NOT NULL,
	"insurance_end_date" date NOT NULL,
	"insurance_premium" numeric(14, 2) NOT NULL,
	"warranty_start_date" date NOT NULL,
	"warranty_end_date" date NOT NULL,
	"special_notes" text,
	"purchase_invoice_id" uuid,
	"operational_status" "asset_register_vehicle_operational_status" DEFAULT 'available' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"deactivated_at" timestamp with time zone,
	"deactivate_reason" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "asset_register_fleet_code_counters" ADD CONSTRAINT "asset_register_fleet_code_counters_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_register_vehicles" ADD CONSTRAINT "asset_register_vehicles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_register_vehicles" ADD CONSTRAINT "asset_register_vehicles_asset_class_id_asset_register_asset_classes_id_fk" FOREIGN KEY ("asset_class_id") REFERENCES "public"."asset_register_asset_classes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_register_vehicles" ADD CONSTRAINT "asset_register_vehicles_asset_master_id_asset_register_asset_masters_id_fk" FOREIGN KEY ("asset_master_id") REFERENCES "public"."asset_register_asset_masters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "asset_register_vehicles_org_fleet_code_uidx" ON "asset_register_vehicles" USING btree ("organization_id","fleet_code");--> statement-breakpoint
CREATE INDEX "asset_register_vehicles_organization_id_idx" ON "asset_register_vehicles" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "asset_register_vehicles_asset_class_id_idx" ON "asset_register_vehicles" USING btree ("asset_class_id");--> statement-breakpoint
CREATE INDEX "asset_register_vehicles_asset_master_id_idx" ON "asset_register_vehicles" USING btree ("asset_master_id");--> statement-breakpoint
CREATE INDEX "asset_register_vehicles_org_class_active_idx" ON "asset_register_vehicles" USING btree ("organization_id","asset_class_id","is_active");--> statement-breakpoint
CREATE INDEX "asset_register_vehicles_org_operational_status_idx" ON "asset_register_vehicles" USING btree ("organization_id","operational_status");--> statement-breakpoint
CREATE INDEX "asset_register_vehicles_registration_number_idx" ON "asset_register_vehicles" USING btree ("organization_id","registration_number");
