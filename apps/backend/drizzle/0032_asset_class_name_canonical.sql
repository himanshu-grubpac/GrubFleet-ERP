-- Class name is the sole system-generated identifier (meeting underscore format).
-- Backfill name from legacy code where they differ, then drop redundant code column.
UPDATE "asset_register_asset_classes"
SET "name" = "code"
WHERE "name" IS DISTINCT FROM "code";
--> statement-breakpoint
DROP INDEX IF EXISTS "asset_register_asset_classes_org_code_uidx";
--> statement-breakpoint
ALTER TABLE "asset_register_asset_classes" DROP COLUMN IF EXISTS "code";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "asset_register_asset_classes_org_name_uidx"
  ON "asset_register_asset_classes" ("organization_id", "name");
