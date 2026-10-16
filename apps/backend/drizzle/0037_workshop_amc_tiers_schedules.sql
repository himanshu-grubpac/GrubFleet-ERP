CREATE TABLE IF NOT EXISTS "workshop_amc_tiers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "name" varchar(120) NOT NULL,
  "description" text,
  "price_display_label" varchar(120),
  "subscriber_count" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "workshop_amc_tiers_organization_id_idx" ON "workshop_amc_tiers" ("organization_id");

CREATE UNIQUE INDEX IF NOT EXISTS "workshop_amc_tiers_org_name_uidx" ON "workshop_amc_tiers" ("organization_id", "name");

CREATE TABLE IF NOT EXISTS "workshop_maintenance_schedules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "name" varchar(255) NOT NULL,
  "asset_class_label" varchar(255),
  "interval_label" varchar(120),
  "vehicle_count" integer DEFAULT 0 NOT NULL,
  "threshold_reached_count" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "workshop_maintenance_schedules_organization_id_idx" ON "workshop_maintenance_schedules" ("organization_id");

CREATE UNIQUE INDEX IF NOT EXISTS "workshop_maintenance_schedules_org_name_uidx" ON "workshop_maintenance_schedules" ("organization_id", "name");
