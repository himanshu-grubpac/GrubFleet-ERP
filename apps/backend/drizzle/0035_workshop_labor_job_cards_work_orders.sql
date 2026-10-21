CREATE TYPE "public"."workshop_work_order_status" AS ENUM('open', 'in_progress', 'closed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."workshop_work_order_part_line_source" AS ENUM('template', 'additional');--> statement-breakpoint
CREATE TYPE "public"."workshop_work_order_labor_line_source" AS ENUM('template', 'additional');--> statement-breakpoint
CREATE TABLE "workshop_labor_job_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"labor_charge_minor" bigint DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"deactivate_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workshop_labor_job_card_parts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"labor_job_card_id" uuid NOT NULL,
	"inventory_part_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workshop_work_order_number_sequences" (
	"organization_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"last_seq" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workshop_work_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"work_order_number" varchar(32) NOT NULL,
	"status" "workshop_work_order_status" DEFAULT 'open' NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"labor_job_card_id" uuid,
	"technician_employee_id" uuid,
	"expected_completion_date" date,
	"reported_by" varchar(255),
	"odometer_reading" integer,
	"issue_description" text,
	"notes" text,
	"parts_total_minor" bigint DEFAULT 0 NOT NULL,
	"labor_total_minor" bigint DEFAULT 0 NOT NULL,
	"net_total_minor" bigint DEFAULT 0 NOT NULL,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workshop_work_order_part_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"work_order_id" uuid NOT NULL,
	"inventory_part_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"unit_cost_minor" bigint NOT NULL,
	"line_source" "workshop_work_order_part_line_source" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workshop_work_order_labor_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"work_order_id" uuid NOT NULL,
	"description" varchar(255) NOT NULL,
	"amount_minor" bigint NOT NULL,
	"line_source" "workshop_work_order_labor_line_source" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workshop_work_order_overdue_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"work_order_id" uuid NOT NULL,
	"logged_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expected_completion_date" date NOT NULL,
	"days_overdue" integer NOT NULL,
	"note" text
);
--> statement-breakpoint
ALTER TABLE "workshop_labor_job_card_parts" ADD CONSTRAINT "workshop_labor_job_card_parts_labor_job_card_id_workshop_labor_job_cards_id_fk" FOREIGN KEY ("labor_job_card_id") REFERENCES "public"."workshop_labor_job_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workshop_labor_job_card_parts" ADD CONSTRAINT "workshop_labor_job_card_parts_inventory_part_id_inventory_catalog_parts_id_fk" FOREIGN KEY ("inventory_part_id") REFERENCES "public"."inventory_catalog_parts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workshop_work_orders" ADD CONSTRAINT "workshop_work_orders_vehicle_id_asset_register_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."asset_register_vehicles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workshop_work_orders" ADD CONSTRAINT "workshop_work_orders_labor_job_card_id_workshop_labor_job_cards_id_fk" FOREIGN KEY ("labor_job_card_id") REFERENCES "public"."workshop_labor_job_cards"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workshop_work_orders" ADD CONSTRAINT "workshop_work_orders_technician_employee_id_organisation_employees_id_fk" FOREIGN KEY ("technician_employee_id") REFERENCES "public"."organisation_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workshop_work_order_part_lines" ADD CONSTRAINT "workshop_work_order_part_lines_work_order_id_workshop_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."workshop_work_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workshop_work_order_part_lines" ADD CONSTRAINT "workshop_work_order_part_lines_inventory_part_id_inventory_catalog_parts_id_fk" FOREIGN KEY ("inventory_part_id") REFERENCES "public"."inventory_catalog_parts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workshop_work_order_labor_lines" ADD CONSTRAINT "workshop_work_order_labor_lines_work_order_id_workshop_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."workshop_work_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workshop_work_order_overdue_logs" ADD CONSTRAINT "workshop_work_order_overdue_logs_work_order_id_workshop_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."workshop_work_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workshop_labor_job_cards_organization_id_idx" ON "workshop_labor_job_cards" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "workshop_labor_job_cards_org_active_idx" ON "workshop_labor_job_cards" USING btree ("organization_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "workshop_labor_job_cards_org_name_uidx" ON "workshop_labor_job_cards" USING btree ("organization_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "workshop_labor_job_card_parts_card_part_uidx" ON "workshop_labor_job_card_parts" USING btree ("labor_job_card_id","inventory_part_id");--> statement-breakpoint
CREATE INDEX "workshop_labor_job_card_parts_part_id_idx" ON "workshop_labor_job_card_parts" USING btree ("inventory_part_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workshop_work_order_number_sequences_org_year_uidx" ON "workshop_work_order_number_sequences" USING btree ("organization_id","year");--> statement-breakpoint
CREATE UNIQUE INDEX "workshop_work_orders_org_number_uidx" ON "workshop_work_orders" USING btree ("organization_id","work_order_number");--> statement-breakpoint
CREATE INDEX "workshop_work_orders_organization_id_idx" ON "workshop_work_orders" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "workshop_work_orders_org_status_idx" ON "workshop_work_orders" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "workshop_work_orders_vehicle_id_idx" ON "workshop_work_orders" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "workshop_work_orders_technician_id_idx" ON "workshop_work_orders" USING btree ("technician_employee_id");--> statement-breakpoint
CREATE INDEX "workshop_work_orders_expected_completion_idx" ON "workshop_work_orders" USING btree ("organization_id","expected_completion_date");--> statement-breakpoint
CREATE INDEX "workshop_work_order_part_lines_work_order_id_idx" ON "workshop_work_order_part_lines" USING btree ("work_order_id");--> statement-breakpoint
CREATE INDEX "workshop_work_order_labor_lines_work_order_id_idx" ON "workshop_work_order_labor_lines" USING btree ("work_order_id");--> statement-breakpoint
CREATE INDEX "workshop_work_order_overdue_logs_work_order_id_idx" ON "workshop_work_order_overdue_logs" USING btree ("work_order_id");
