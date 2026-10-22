ALTER TABLE "asset_register_vehicles" ADD COLUMN "insurance_supplier_id" uuid;--> statement-breakpoint
ALTER TABLE "asset_register_vehicles" ADD CONSTRAINT "asset_register_vehicles_insurance_supplier_id_organisation_suppliers_id_fk" FOREIGN KEY ("insurance_supplier_id") REFERENCES "public"."organisation_suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "asset_register_vehicles_insurance_supplier_id_idx" ON "asset_register_vehicles" USING btree ("insurance_supplier_id");
