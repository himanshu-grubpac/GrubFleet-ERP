/**
 * Dev-only: idempotent sample org roles (~5) for Administration UI testing.
 *
 * Run: npx ts-node -r tsconfig-paths/register src/database/seed/seed-dev-org-roles.ts --confirm-dev
 * Or via: node scripts/dev-clean-test-roles.mjs --seed-only
 */
import { and, eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { pgPoolOptions } from '../pg-pool-options';
import * as schema from '../schema';
import { permissions, rolePermissions, roles } from '../schema';
import {
  DEV_DEMO_ORG_ROLE_SPECS,
  DEV_DEMO_ORG_ROLE_NAMES,
} from './dev-role-data-policy';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  assertDevOnly,
  maskDatabaseUrl,
  resolveDevDatabaseUrl,
  resolveDevOrganizationId,
} from './organisation-dev-data-guards';

type AppDb = NodePgDatabase<typeof schema>;

export async function seedDevOrgDemoRoles(
  db: AppDb,
  devOrgId: string,
): Promise<string[]> {
  const allKeys = [
    ...new Set(DEV_DEMO_ORG_ROLE_SPECS.flatMap((s) => s.permissionKeys)),
  ];
  const permRows = await db
    .select({ id: permissions.id, key: permissions.key })
    .from(permissions)
    .where(inArray(permissions.key, allKeys));
  const permIdByKey = new Map(permRows.map((p) => [p.key, p.id]));
  const missing = allKeys.filter((k) => !permIdByKey.has(k));
  if (missing.length > 0) {
    throw new Error(
      `Permission catalog missing keys (run db:seed first): ${missing.join(', ')}`,
    );
  }

  const seeded: string[] = [];
  for (const spec of DEV_DEMO_ORG_ROLE_SPECS) {
    await db
      .insert(roles)
      .values({
        organizationId: devOrgId,
        name: spec.name,
        scope: 'organization',
        description: spec.description,
        isSystem: false,
        isActive: true,
      })
      .onConflictDoNothing({
        target: [roles.organizationId, roles.name],
      });

    const [role] = await db
      .select({ id: roles.id })
      .from(roles)
      .where(and(eq(roles.organizationId, devOrgId), eq(roles.name, spec.name)))
      .limit(1);
    if (!role) {
      throw new Error(`Failed to resolve dev demo role ${spec.name}`);
    }

    const permissionIds = spec.permissionKeys.map((key) =>
      permIdByKey.get(key)!,
    );
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, role.id));
    await db.insert(rolePermissions).values(
      permissionIds.map((permissionId) => ({
        roleId: role.id,
        permissionId,
      })),
    );
    seeded.push(spec.name);
  }

  return seeded;
}

async function main(): Promise<void> {
  const connectionString = resolveDevDatabaseUrl();
  assertDevOnly(connectionString);

  const pool = new Pool(pgPoolOptions(connectionString));
  const db = drizzle(pool, { schema });
  const devOrgId = await resolveDevOrganizationId(db);
  const seededRoleNames = await seedDevOrgDemoRoles(db, devOrgId);

  console.log(
    JSON.stringify(
      {
        connection: maskDatabaseUrl(connectionString),
        organizationId: devOrgId,
        seededRoleNames,
        expectedNames: DEV_DEMO_ORG_ROLE_NAMES,
      },
      null,
      2,
    ),
  );

  await pool.end();
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
