ALTER TABLE "roles" ADD COLUMN "parent_role_id" uuid;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_parent_role_id_roles_id_fk" FOREIGN KEY ("parent_role_id") REFERENCES "public"."roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "roles_parent_role_id_idx" ON "roles" USING btree ("parent_role_id");
