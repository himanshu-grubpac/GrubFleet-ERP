CREATE TYPE "public"."lease_contract_status" AS ENUM(
  'draft',
  'pending_approval',
  'approved',
  'active',
  'awaiting_assets',
  'deactivated',
  'billing_paused',
  'pending_termination',
  'closed',
  'concluded'
);
--> statement-breakpoint
CREATE TYPE "public"."fleet_billing_frequency" AS ENUM('monthly', 'quarterly', 'annual');
--> statement-breakpoint
CREATE TYPE "public"."fleet_vehicle_status" AS ENUM(
  'available',
  'reserved',
  'leased',
  'returned',
  'workshop',
  'sold',
  'retired'
);
--> statement-breakpoint
CREATE TYPE "public"."fleet_approval_source_type" AS ENUM(
  'contract_rate_exception',
  'contract_termination'
);
--> statement-breakpoint
CREATE TYPE "public"."fleet_approval_status" AS ENUM('pending', 'approved', 'rejected');
--> statement-breakpoint
CREATE TABLE "fleet_clients" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "client_code" varchar(32) NOT NULL,
  "company_name" varchar(255) NOT NULL,
  "poc_name" varchar(255) NOT NULL,
  "poc_contact_number" varchar(32) NOT NULL,
  "poc_email" varchar(320) NOT NULL,
  "address" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fleet_vehicles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "vin" varchar(64) NOT NULL,
  "registration_no" varchar(32) NOT NULL,
  "registration_expiry" timestamp with time zone NOT NULL,
  "insurance_expiry" timestamp with time zone NOT NULL,
  "odometer" integer DEFAULT 0 NOT NULL,
  "asset_class" varchar(64) NOT NULL,
  "location" varchar(120),
  "status" "fleet_vehicle_status" DEFAULT 'available' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lease_contracts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "contract_number" varchar(32) NOT NULL,
  "client_id" uuid,
  "status" "lease_contract_status" DEFAULT 'draft' NOT NULL,
  "start_date" timestamp with time zone,
  "end_date" timestamp with time zone,
  "term_months" integer,
  "security_deposit" numeric(14, 2),
  "billing_frequency" "fleet_billing_frequency" DEFAULT 'monthly' NOT NULL,
  "additional_terms" text,
  "amc_tier" varchar(120),
  "awaiting_future_assets" boolean DEFAULT false NOT NULL,
  "billing_paused" boolean DEFAULT false NOT NULL,
  "on_hold" boolean DEFAULT false NOT NULL,
  "rate_requires_approval" boolean DEFAULT false NOT NULL,
  "description" text,
  "created_by_user_id" uuid,
  "updated_by_user_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lease_contract_asset_lines" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "contract_id" uuid NOT NULL,
  "asset_class" varchar(64) NOT NULL,
  "committed_quantity" integer NOT NULL,
  "rate_per_vehicle_month" numeric(14, 2) NOT NULL,
  "availability_covered" boolean DEFAULT false NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lease_contract_vehicles" (
  "contract_id" uuid NOT NULL,
  "vehicle_id" uuid NOT NULL,
  "assigned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lease_contract_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "contract_id" uuid NOT NULL,
  "organization_id" uuid NOT NULL,
  "event_type" varchar(64) NOT NULL,
  "message" text NOT NULL,
  "actor_user_id" uuid,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fleet_vehicle_allocations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "contract_id" uuid NOT NULL,
  "vehicle_id" uuid NOT NULL,
  "reassignment_confirmation" text,
  "notified_stakeholders" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fleet_return_inspections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "contract_id" uuid NOT NULL,
  "vehicle_id" uuid NOT NULL,
  "odometer_reading" integer NOT NULL,
  "condition_checklist" jsonb NOT NULL,
  "damage_record_id" uuid,
  "registered_return" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fleet_approval_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "contract_id" uuid NOT NULL,
  "source_type" "fleet_approval_source_type" NOT NULL,
  "status" "fleet_approval_status" DEFAULT 'pending' NOT NULL,
  "requested_by_user_id" uuid NOT NULL,
  "resolved_by_user_id" uuid,
  "resolved_at" timestamp with time zone,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fleet_clients" ADD CONSTRAINT "fleet_clients_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "fleet_vehicles" ADD CONSTRAINT "fleet_vehicles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "lease_contracts" ADD CONSTRAINT "lease_contracts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "lease_contracts" ADD CONSTRAINT "lease_contracts_client_id_fleet_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."fleet_clients"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "lease_contract_asset_lines" ADD CONSTRAINT "lease_contract_asset_lines_contract_id_lease_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."lease_contracts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "lease_contract_vehicles" ADD CONSTRAINT "lease_contract_vehicles_contract_id_lease_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."lease_contracts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "lease_contract_vehicles" ADD CONSTRAINT "lease_contract_vehicles_vehicle_id_fleet_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."fleet_vehicles"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "lease_contract_events" ADD CONSTRAINT "lease_contract_events_contract_id_lease_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."lease_contracts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "fleet_vehicle_allocations" ADD CONSTRAINT "fleet_vehicle_allocations_contract_id_lease_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."lease_contracts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "fleet_return_inspections" ADD CONSTRAINT "fleet_return_inspections_contract_id_lease_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."lease_contracts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "fleet_approval_requests" ADD CONSTRAINT "fleet_approval_requests_contract_id_lease_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."lease_contracts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "fleet_clients_org_code_uidx" ON "fleet_clients" USING btree ("organization_id","client_code");
--> statement-breakpoint
CREATE INDEX "fleet_clients_organization_id_idx" ON "fleet_clients" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "fleet_clients_company_name_idx" ON "fleet_clients" USING btree ("company_name");
--> statement-breakpoint
CREATE UNIQUE INDEX "fleet_vehicles_org_reg_uidx" ON "fleet_vehicles" USING btree ("organization_id","registration_no");
--> statement-breakpoint
CREATE INDEX "fleet_vehicles_organization_id_idx" ON "fleet_vehicles" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "fleet_vehicles_status_idx" ON "fleet_vehicles" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "fleet_vehicles_asset_class_idx" ON "fleet_vehicles" USING btree ("asset_class");
--> statement-breakpoint
CREATE UNIQUE INDEX "lease_contracts_org_number_uidx" ON "lease_contracts" USING btree ("organization_id","contract_number");
--> statement-breakpoint
CREATE INDEX "lease_contracts_organization_id_idx" ON "lease_contracts" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "lease_contracts_status_idx" ON "lease_contracts" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "lease_contracts_client_id_idx" ON "lease_contracts" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "lease_contract_asset_lines_contract_id_idx" ON "lease_contract_asset_lines" USING btree ("contract_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "lease_contract_asset_lines_contract_class_uidx" ON "lease_contract_asset_lines" USING btree ("contract_id","asset_class");
--> statement-breakpoint
CREATE UNIQUE INDEX "lease_contract_vehicles_contract_vehicle_uidx" ON "lease_contract_vehicles" USING btree ("contract_id","vehicle_id");
--> statement-breakpoint
CREATE INDEX "lease_contract_vehicles_vehicle_id_idx" ON "lease_contract_vehicles" USING btree ("vehicle_id");
--> statement-breakpoint
CREATE INDEX "lease_contract_events_contract_id_idx" ON "lease_contract_events" USING btree ("contract_id");
--> statement-breakpoint
CREATE INDEX "lease_contract_events_created_at_idx" ON "lease_contract_events" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX "fleet_vehicle_allocations_contract_id_idx" ON "fleet_vehicle_allocations" USING btree ("contract_id");
--> statement-breakpoint
CREATE INDEX "fleet_return_inspections_contract_id_idx" ON "fleet_return_inspections" USING btree ("contract_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "fleet_return_inspections_contract_vehicle_uidx" ON "fleet_return_inspections" USING btree ("contract_id","vehicle_id");
--> statement-breakpoint
CREATE INDEX "fleet_approval_requests_contract_id_idx" ON "fleet_approval_requests" USING btree ("contract_id");
--> statement-breakpoint
CREATE INDEX "fleet_approval_requests_status_idx" ON "fleet_approval_requests" USING btree ("status");
