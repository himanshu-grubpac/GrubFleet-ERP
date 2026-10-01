CREATE TABLE "organisation_clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"address_line1" varchar(255) NOT NULL,
	"address_line2" varchar(255),
	"address_city" varchar(120),
	"address_state" varchar(120),
	"address_district" varchar(120),
	"address_pincode" varchar(20),
	"address_country" varchar(2) DEFAULT 'IN' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organisation_client_pocs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"contact_number" varchar(32) NOT NULL,
	"email" varchar(320) NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organisation_client_pocs" ADD CONSTRAINT "organisation_client_pocs_client_id_organisation_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."organisation_clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "organisation_clients_organization_id_idx" ON "organisation_clients" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "organisation_clients_org_active_idx" ON "organisation_clients" USING btree ("organization_id","is_active");--> statement-breakpoint
CREATE INDEX "organisation_clients_name_idx" ON "organisation_clients" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "organisation_client_pocs_client_id_idx" ON "organisation_client_pocs" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "organisation_client_pocs_name_idx" ON "organisation_client_pocs" USING btree ("name");--> statement-breakpoint
CREATE INDEX "organisation_client_pocs_email_idx" ON "organisation_client_pocs" USING btree ("email");
