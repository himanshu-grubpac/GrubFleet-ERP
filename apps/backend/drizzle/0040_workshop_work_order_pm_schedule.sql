DO $$ BEGIN
 CREATE TYPE "public"."workshop_work_order_type" AS ENUM('general', 'pm', 'return_inspection');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."workshop_work_order_source" AS ENUM('manual', 'maintenance_schedule', 'lease_return');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "workshop_work_orders" ADD COLUMN IF NOT EXISTS "work_order_type" "workshop_work_order_type" DEFAULT 'general' NOT NULL;
--> statement-breakpoint
ALTER TABLE "workshop_work_orders" ADD COLUMN IF NOT EXISTS "work_order_source" "workshop_work_order_source" DEFAULT 'manual' NOT NULL;
--> statement-breakpoint
ALTER TABLE "workshop_work_orders" ADD COLUMN IF NOT EXISTS "maintenance_schedule_id" uuid;
--> statement-breakpoint
ALTER TABLE "workshop_work_orders" ADD COLUMN IF NOT EXISTS "condition_checklist" jsonb;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workshop_work_orders" ADD CONSTRAINT "workshop_work_orders_maintenance_schedule_id_workshop_maintenance_schedules_id_fk" FOREIGN KEY ("maintenance_schedule_id") REFERENCES "public"."workshop_maintenance_schedules"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workshop_work_orders_org_pm_schedule_vehicle_idx" ON "workshop_work_orders" USING btree ("organization_id","maintenance_schedule_id","vehicle_id","work_order_type","status");
