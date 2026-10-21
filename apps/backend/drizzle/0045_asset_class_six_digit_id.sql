CREATE TABLE IF NOT EXISTS "asset_register_asset_class_id_counters" (
	"organization_id" uuid PRIMARY KEY NOT NULL,
	"next_sequence" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "asset_register_asset_classes" ADD COLUMN IF NOT EXISTS "class_id" varchar(6);
--> statement-breakpoint
WITH numbered AS (
	SELECT
		id,
		LPAD(
			(ROW_NUMBER() OVER (PARTITION BY organization_id ORDER BY created_at ASC, id ASC))::text,
			6,
			'0'
		) AS new_class_id
	FROM asset_register_asset_classes
	WHERE class_id IS NULL
)
UPDATE asset_register_asset_classes AS ac
SET class_id = numbered.new_class_id
FROM numbered
WHERE ac.id = numbered.id;
--> statement-breakpoint
ALTER TABLE "asset_register_asset_classes" ALTER COLUMN "class_id" SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "asset_register_asset_classes_org_class_id_uidx"
	ON "asset_register_asset_classes" ("organization_id", "class_id");
--> statement-breakpoint
INSERT INTO "asset_register_asset_class_id_counters" ("organization_id", "next_sequence")
SELECT
	organization_id,
	COALESCE(MAX(class_id::integer), 0) + 1
FROM asset_register_asset_classes
GROUP BY organization_id
ON CONFLICT ("organization_id") DO UPDATE
SET "next_sequence" = EXCLUDED."next_sequence";
