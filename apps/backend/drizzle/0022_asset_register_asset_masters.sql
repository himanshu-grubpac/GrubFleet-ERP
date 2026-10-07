CREATE TABLE "asset_register_asset_masters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"asset_class_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"deactivated_at" timestamp with time zone,
	"deactivate_reason" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "asset_register_asset_masters" ADD CONSTRAINT "asset_register_asset_masters_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_register_asset_masters" ADD CONSTRAINT "asset_register_asset_masters_asset_class_id_asset_register_asset_classes_id_fk" FOREIGN KEY ("asset_class_id") REFERENCES "public"."asset_register_asset_classes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "asset_register_asset_masters_org_class_name_uidx" ON "asset_register_asset_masters" USING btree ("organization_id","asset_class_id","name");--> statement-breakpoint
CREATE INDEX "asset_register_asset_masters_organization_id_idx" ON "asset_register_asset_masters" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "asset_register_asset_masters_asset_class_id_idx" ON "asset_register_asset_masters" USING btree ("asset_class_id");--> statement-breakpoint
CREATE INDEX "asset_register_asset_masters_org_class_active_idx" ON "asset_register_asset_masters" USING btree ("organization_id","asset_class_id","is_active");--> statement-breakpoint
CREATE INDEX "asset_register_asset_masters_name_idx" ON "asset_register_asset_masters" USING btree ("organization_id","name");
