ALTER TABLE "permissions" ADD COLUMN IF NOT EXISTS "kind" varchar(16);--> statement-breakpoint
UPDATE "permissions" SET "kind" = lower("action") WHERE "kind" IS NULL;--> statement-breakpoint
INSERT INTO "permissions" ("key", "module", "action", "kind", "description")
VALUES
  ('dashboard.view', 'dashboard', 'view', 'view', 'View access for Dashboard module'),
  ('fleet_leasing.view', 'fleet_leasing', 'view', 'view', 'View access for Fleet & Leasing module'),
  ('fleet_leasing.manage', 'fleet_leasing', 'manage', 'manage', 'Manage access for Fleet & Leasing module'),
  ('asset_register.view', 'asset_register', 'view', 'view', 'View access for Asset Register module'),
  ('asset_register.manage', 'asset_register', 'manage', 'manage', 'Manage access for Asset Register module'),
  ('workshop.view', 'workshop', 'view', 'view', 'View access for Workshop module'),
  ('workshop.manage', 'workshop', 'manage', 'manage', 'Manage access for Workshop module'),
  ('inventory.view', 'inventory', 'view', 'view', 'View access for Inventory module'),
  ('inventory.manage', 'inventory', 'manage', 'manage', 'Manage access for Inventory module'),
  ('organisation.view', 'organisation', 'view', 'view', 'View access for Organisation module'),
  ('organisation.manage', 'organisation', 'manage', 'manage', 'Manage access for Organisation module'),
  ('finance.view', 'finance', 'view', 'view', 'View access for Finance module'),
  ('finance.manage', 'finance', 'manage', 'manage', 'Manage access for Finance module'),
  ('administration.view', 'administration', 'view', 'view', 'View access for Administration module'),
  ('administration.manage', 'administration', 'manage', 'manage', 'Manage access for Administration module'),
  ('platform.view', 'platform', 'view', 'view', 'View access for Platform module'),
  ('platform.manage', 'platform', 'manage', 'manage', 'Manage access for Platform module')
ON CONFLICT ("key") DO UPDATE SET
  "module" = EXCLUDED."module",
  "action" = EXCLUDED."action",
  "kind" = EXCLUDED."kind",
  "description" = EXCLUDED."description";--> statement-breakpoint
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT DISTINCT rp."role_id", new_p."id"
FROM "role_permissions" rp
INNER JOIN "permissions" old_p ON old_p."id" = rp."permission_id"
INNER JOIN "permissions" new_p ON new_p."key" = CASE old_p."key"
  WHEN 'platform:VIEW' THEN 'platform.view'
  WHEN 'platform:MANAGE' THEN 'platform.manage'
  WHEN 'organization:VIEW' THEN 'organisation.view'
  WHEN 'organization:MANAGE' THEN 'organisation.manage'
  WHEN 'organizations:VIEW' THEN 'administration.view'
  WHEN 'organizations:MANAGE' THEN 'administration.manage'
  WHEN 'users:VIEW' THEN 'administration.view'
  WHEN 'users:MANAGE' THEN 'administration.manage'
  WHEN 'roles:VIEW' THEN 'administration.view'
  WHEN 'roles:MANAGE' THEN 'administration.manage'
  WHEN 'permissions:VIEW' THEN 'administration.view'
  WHEN 'audit:VIEW' THEN 'administration.view'
  WHEN 'fleet:VIEW' THEN 'fleet_leasing.view'
  WHEN 'fleet:MANAGE' THEN 'fleet_leasing.manage'
  WHEN 'assets:VIEW' THEN 'asset_register.view'
  WHEN 'assets:MANAGE' THEN 'asset_register.manage'
  WHEN 'workshop:VIEW' THEN 'workshop.view'
  WHEN 'workshop:MANAGE' THEN 'workshop.manage'
  WHEN 'inventory:VIEW' THEN 'inventory.view'
  WHEN 'inventory:MANAGE' THEN 'inventory.manage'
  WHEN 'finance:VIEW' THEN 'finance.view'
  WHEN 'finance:MANAGE' THEN 'finance.manage'
  ELSE NULL
END
WHERE old_p."key" LIKE '%:%'
  AND new_p."id" IS NOT NULL
ON CONFLICT DO NOTHING;--> statement-breakpoint
DELETE FROM "role_permissions" rp
USING "permissions" p
WHERE rp."permission_id" = p."id"
  AND p."key" LIKE '%:%';--> statement-breakpoint
DELETE FROM "permissions" WHERE "key" LIKE '%:%';
