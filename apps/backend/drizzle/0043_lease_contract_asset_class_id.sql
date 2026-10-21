ALTER TABLE "lease_contract_asset_lines" ADD COLUMN IF NOT EXISTS "asset_class_id" uuid;--> statement-breakpoint
UPDATE "lease_contract_asset_lines" AS l
SET "asset_class_id" = c."id"
FROM "lease_contracts" AS lc,
     "asset_register_asset_classes" AS c
WHERE l."contract_id" = lc."id"
  AND c."organization_id" = lc."organization_id"
  AND c."name" = trim(l."asset_class")
  AND l."asset_class_id" IS NULL;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "lease_contract_asset_lines"
    ADD CONSTRAINT "lease_contract_asset_lines_asset_class_id_fk"
    FOREIGN KEY ("asset_class_id") REFERENCES "public"."asset_register_asset_classes"("id")
    ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lease_contract_asset_lines_asset_class_id_idx"
  ON "lease_contract_asset_lines" ("asset_class_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "lease_contract_asset_lines_contract_class_id_uidx"
  ON "lease_contract_asset_lines" ("contract_id", "asset_class_id")
  WHERE "asset_class_id" IS NOT NULL;
