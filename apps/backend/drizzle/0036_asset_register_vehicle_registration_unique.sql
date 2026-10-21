-- Resolve duplicate registration numbers per org (keep earliest row; suffix others with fleet sequence).
WITH "ranked" AS (
  SELECT
    "id",
    "fleet_code",
    "registration_number",
    ROW_NUMBER() OVER (
      PARTITION BY "organization_id", upper(trim("registration_number"))
      ORDER BY "created_at" ASC, "id" ASC
    ) AS "rn"
  FROM "asset_register_vehicles"
),
"dupes" AS (
  SELECT "id", "fleet_code", "registration_number"
  FROM "ranked"
  WHERE "rn" > 1
)
UPDATE "asset_register_vehicles" AS "v"
SET
  "registration_number" = left(
    trim("v"."registration_number") || '-' || regexp_replace("v"."fleet_code", '^.*-', ''),
    32
  ),
  "updated_at" = now()
FROM "dupes" AS "d"
WHERE "v"."id" = "d"."id";
--> statement-breakpoint
DROP INDEX IF EXISTS "asset_register_vehicles_registration_number_idx";
--> statement-breakpoint
CREATE UNIQUE INDEX "asset_register_vehicles_org_registration_norm_uidx" ON "asset_register_vehicles" USING btree ("organization_id", (upper(trim("registration_number"))));
