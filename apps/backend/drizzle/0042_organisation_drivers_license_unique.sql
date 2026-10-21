-- One driving licence per organisation (case/space insensitive).
WITH "ranked" AS (
  SELECT
    "id",
    "license_number",
    ROW_NUMBER() OVER (
      PARTITION BY "organization_id", upper(trim("license_number"))
      ORDER BY "created_at" ASC, "id" ASC
    ) AS "rn"
  FROM "organisation_drivers"
),
"dupes" AS (
  SELECT "id", "license_number"
  FROM "ranked"
  WHERE "rn" > 1
)
UPDATE "organisation_drivers" AS "d"
SET
  "license_number" = left(
    trim("d"."license_number") || '-DUP-' || left(replace("d"."id"::text, '-', ''), 8),
    64
  ),
  "updated_at" = now()
FROM "dupes" AS "x"
WHERE "d"."id" = "x"."id";
--> statement-breakpoint
CREATE UNIQUE INDEX "organisation_drivers_org_license_norm_uidx" ON "organisation_drivers" USING btree ("organization_id", (upper(trim("license_number"))));
