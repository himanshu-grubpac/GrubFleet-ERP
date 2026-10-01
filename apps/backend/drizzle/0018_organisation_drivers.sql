CREATE TABLE "organisation_drivers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"cpr_no" varchar(20) NOT NULL,
	"phone" varchar(32) NOT NULL,
	"email" varchar(320) NOT NULL,
	"license_number" varchar(64) NOT NULL,
	"license_expiry" date NOT NULL,
	"supplier_id" uuid NOT NULL,
	"address_line1" varchar(255) NOT NULL,
	"address_line2" varchar(255),
	"address_city" varchar(120),
	"address_state" varchar(120),
	"address_district" varchar(120),
	"address_pincode" varchar(20),
	"address_country" varchar(2) DEFAULT 'IN' NOT NULL,
	"assigned_vehicle_code" varchar(64),
	"assigned_vehicle_asset_class" varchar(255),
	"assigned_active_lease_id" varchar(64),
	"vehicle_tied_to_contract" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "organisation_drivers_organization_id_idx" ON "organisation_drivers" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "organisation_drivers_org_active_idx" ON "organisation_drivers" USING btree ("organization_id","is_active");--> statement-breakpoint
CREATE INDEX "organisation_drivers_org_supplier_idx" ON "organisation_drivers" USING btree ("organization_id","supplier_id");--> statement-breakpoint
CREATE INDEX "organisation_drivers_license_expiry_idx" ON "organisation_drivers" USING btree ("organization_id","license_expiry");--> statement-breakpoint
CREATE UNIQUE INDEX "organisation_drivers_org_cpr_uidx" ON "organisation_drivers" USING btree ("organization_id","cpr_no");--> statement-breakpoint
CREATE INDEX "organisation_drivers_name_idx" ON "organisation_drivers" USING btree ("organization_id","name");
