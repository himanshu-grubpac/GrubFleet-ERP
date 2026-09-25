ALTER TABLE "lease_contracts" ADD COLUMN "renewed_from_contract_id" uuid;
--> statement-breakpoint
ALTER TABLE "lease_contracts" ADD COLUMN "requires_edit_review" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "lease_contracts" ADD CONSTRAINT "lease_contracts_renewed_from_contract_id_lease_contracts_id_fk" FOREIGN KEY ("renewed_from_contract_id") REFERENCES "public"."lease_contracts"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "lease_contracts_renewed_from_contract_id_idx" ON "lease_contracts" USING btree ("renewed_from_contract_id");
--> statement-breakpoint
CREATE TABLE "lease_contract_edit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "contract_id" uuid NOT NULL,
  "actor_user_id" uuid,
  "classification" varchar(32) DEFAULT 'clerical' NOT NULL,
  "changed_fields" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lease_contract_edit_logs" ADD CONSTRAINT "lease_contract_edit_logs_contract_id_lease_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."lease_contracts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "lease_contract_edit_logs_contract_id_idx" ON "lease_contract_edit_logs" USING btree ("contract_id");
--> statement-breakpoint
CREATE INDEX "lease_contract_edit_logs_organization_id_idx" ON "lease_contract_edit_logs" USING btree ("organization_id");
--> statement-breakpoint
CREATE TABLE "fleet_damage_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "summary" varchar(255),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "fleet_damage_records_organization_id_idx" ON "fleet_damage_records" USING btree ("organization_id");
