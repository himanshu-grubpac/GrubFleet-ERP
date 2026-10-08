CREATE TYPE "public"."asset_register_vehicle_type" AS ENUM('2W', '3W', '4W');--> statement-breakpoint
CREATE TABLE "asset_register_asset_classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(2000),
	"code" varchar(8) NOT NULL,
	"vehicle_type" "asset_register_vehicle_type" NOT NULL,
	"fuel_type" varchar(64) NOT NULL,
	"mileage_from" numeric(10, 2),
	"mileage_to" numeric(10, 2),
	"mileage_unit" varchar(32),
	"fuel_tank_capacity" numeric(10, 2) NOT NULL,
	"rated_load_from" numeric(12, 2) NOT NULL,
	"rated_load_to" numeric(12, 2) NOT NULL,
	"default_intake_checklist" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"deactivated_at" timestamp with time zone,
	"deactivate_reason" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "asset_register_asset_classes" ADD CONSTRAINT "asset_register_asset_classes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "asset_register_asset_classes_org_code_uidx" ON "asset_register_asset_classes" USING btree ("organization_id","code");--> statement-breakpoint
CREATE INDEX "asset_register_asset_classes_organization_id_idx" ON "asset_register_asset_classes" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "asset_register_asset_classes_org_active_idx" ON "asset_register_asset_classes" USING btree ("organization_id","is_active");--> statement-breakpoint
CREATE INDEX "asset_register_asset_classes_name_idx" ON "asset_register_asset_classes" USING btree ("organization_id","name");
