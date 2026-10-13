ALTER TABLE "asset_register_asset_classes" ALTER COLUMN "code" TYPE varchar(255);
--> statement-breakpoint
ALTER TABLE "asset_register_asset_classes" ALTER COLUMN "fuel_tank_capacity" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "asset_register_asset_classes" ALTER COLUMN "rated_load_from" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "asset_register_asset_classes" ALTER COLUMN "rated_load_to" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "asset_register_asset_classes" ADD COLUMN IF NOT EXISTS "brand" varchar(255);
--> statement-breakpoint
ALTER TABLE "asset_register_asset_classes" ADD COLUMN IF NOT EXISTS "model_name" varchar(255);
--> statement-breakpoint
ALTER TABLE "asset_register_asset_classes" ADD COLUMN IF NOT EXISTS "manufacturing_year" integer;
--> statement-breakpoint
ALTER TABLE "asset_register_asset_classes" ADD COLUMN IF NOT EXISTS "fuel_capacity" numeric(10, 2);
--> statement-breakpoint
ALTER TABLE "asset_register_asset_classes" ADD COLUMN IF NOT EXISTS "fuel_system" varchar(64);
--> statement-breakpoint
ALTER TABLE "asset_register_asset_classes" ADD COLUMN IF NOT EXISTS "color" varchar(128);
--> statement-breakpoint
ALTER TABLE "asset_register_asset_classes" ADD COLUMN IF NOT EXISTS "color_code" varchar(32);
--> statement-breakpoint
ALTER TABLE "asset_register_asset_classes" ADD COLUMN IF NOT EXISTS "engine_displacement_cc" integer;
--> statement-breakpoint
UPDATE "asset_register_asset_classes"
SET
  "brand" = COALESCE("brand", split_part("name", ' ', 1)),
  "model_name" = COALESCE("model_name", "name"),
  "manufacturing_year" = COALESCE("manufacturing_year", 2024),
  "fuel_system" = COALESCE("fuel_system", 'standard'),
  "color" = COALESCE("color", 'unspecified'),
  "color_code" = COALESCE("color_code", 'xx'),
  "engine_displacement_cc" = COALESCE("engine_displacement_cc", 0)
WHERE "brand" IS NULL
   OR "model_name" IS NULL
   OR "manufacturing_year" IS NULL
   OR "fuel_system" IS NULL
   OR "color" IS NULL
   OR "color_code" IS NULL
   OR "engine_displacement_cc" IS NULL;
--> statement-breakpoint
ALTER TABLE "asset_register_asset_classes" ALTER COLUMN "brand" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "asset_register_asset_classes" ALTER COLUMN "model_name" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "asset_register_asset_classes" ALTER COLUMN "manufacturing_year" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "asset_register_asset_classes" ALTER COLUMN "fuel_system" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "asset_register_asset_classes" ALTER COLUMN "color" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "asset_register_asset_classes" ALTER COLUMN "color_code" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "asset_register_asset_classes" ALTER COLUMN "engine_displacement_cc" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "asset_register_vehicles" ALTER COLUMN "asset_master_id" DROP NOT NULL;
