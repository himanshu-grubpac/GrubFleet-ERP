-- Finish name-only model: drop legacy code column (0032 backfill may have run without drop).
DROP INDEX IF EXISTS "asset_register_asset_classes_org_code_uidx";
--> statement-breakpoint
ALTER TABLE "asset_register_asset_classes" DROP COLUMN IF EXISTS "code";
--> statement-breakpoint
DROP INDEX IF EXISTS "asset_register_asset_classes_name_idx";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "asset_register_asset_classes_org_name_uidx"
  ON "asset_register_asset_classes" ("organization_id", "name");
