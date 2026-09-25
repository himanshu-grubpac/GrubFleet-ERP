CREATE TABLE "fleet_client_pocs" (
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
INSERT INTO "fleet_client_pocs" (
  "client_id",
  "name",
  "contact_number",
  "email",
  "is_primary",
  "sort_order"
)
SELECT
  "id",
  "poc_name",
  "poc_contact_number",
  "poc_email",
  true,
  0
FROM "fleet_clients";
--> statement-breakpoint
ALTER TABLE "fleet_client_pocs" ADD CONSTRAINT "fleet_client_pocs_client_id_fleet_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."fleet_clients"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "fleet_clients" DROP COLUMN "poc_name";
--> statement-breakpoint
ALTER TABLE "fleet_clients" DROP COLUMN "poc_contact_number";
--> statement-breakpoint
ALTER TABLE "fleet_clients" DROP COLUMN "poc_email";
--> statement-breakpoint
CREATE INDEX "fleet_client_pocs_client_id_idx" ON "fleet_client_pocs" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX "fleet_client_pocs_name_idx" ON "fleet_client_pocs" USING btree ("name");
--> statement-breakpoint
CREATE INDEX "fleet_client_pocs_email_idx" ON "fleet_client_pocs" USING btree ("email");
