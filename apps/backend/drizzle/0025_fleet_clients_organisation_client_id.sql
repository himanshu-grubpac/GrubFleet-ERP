ALTER TABLE "fleet_clients" ADD COLUMN "organisation_client_id" uuid;--> statement-breakpoint
ALTER TABLE "fleet_clients" ADD CONSTRAINT "fleet_clients_organisation_client_id_organisation_clients_id_fk" FOREIGN KEY ("organisation_client_id") REFERENCES "public"."organisation_clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fleet_clients_organisation_client_id_idx" ON "fleet_clients" USING btree ("organisation_client_id");
