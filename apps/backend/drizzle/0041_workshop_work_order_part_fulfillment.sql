DO $$ BEGIN
 CREATE TYPE "public"."workshop_work_order_part_fulfillment_status" AS ENUM('reserved', 'issued', 'cancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "workshop_work_order_part_lines" ADD COLUMN IF NOT EXISTS "fulfillment_status" "workshop_work_order_part_fulfillment_status" DEFAULT 'reserved' NOT NULL;
--> statement-breakpoint
ALTER TABLE "workshop_work_order_part_lines" ADD COLUMN IF NOT EXISTS "inventory_parts_request_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workshop_work_order_part_lines" ADD CONSTRAINT "workshop_work_order_part_lines_inventory_parts_request_id_inventory_parts_requests_id_fk" FOREIGN KEY ("inventory_parts_request_id") REFERENCES "public"."inventory_parts_requests"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
