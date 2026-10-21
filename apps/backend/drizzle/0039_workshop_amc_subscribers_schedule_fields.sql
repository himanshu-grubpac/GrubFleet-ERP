CREATE TABLE IF NOT EXISTS "workshop_amc_subscribers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "amc_tier_id" uuid NOT NULL,
  "vehicle_id" uuid NOT NULL,
  "subscriber_code" varchar(64) NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "started_at" date,
  "ended_at" date,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "workshop_amc_subscribers_organization_id_idx" ON "workshop_amc_subscribers" ("organization_id");

CREATE INDEX IF NOT EXISTS "workshop_amc_subscribers_tier_id_idx" ON "workshop_amc_subscribers" ("amc_tier_id");

CREATE UNIQUE INDEX IF NOT EXISTS "workshop_amc_subscribers_org_code_uidx" ON "workshop_amc_subscribers" ("organization_id", "subscriber_code");

CREATE UNIQUE INDEX IF NOT EXISTS "workshop_amc_subscribers_org_vehicle_tier_uidx" ON "workshop_amc_subscribers" ("organization_id", "amc_tier_id", "vehicle_id");

ALTER TABLE "workshop_maintenance_schedules" ADD COLUMN IF NOT EXISTS "maintenance_type" varchar(64);

ALTER TABLE "workshop_maintenance_schedules" ADD COLUMN IF NOT EXISTS "interval_type" varchar(32);

ALTER TABLE "workshop_maintenance_schedules" ADD COLUMN IF NOT EXISTS "vehicle_applicability" varchar(32);

ALTER TABLE "workshop_maintenance_schedules" ADD COLUMN IF NOT EXISTS "description" text;
