import * as dotenv from 'dotenv';
import * as path from 'path';
import { eq, inArray, ne } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { pgPoolOptions } from '../pg-pool-options';
import * as schema from '../schema';
import { roles, users } from '../schema';
import {
  DEV_ADMIN_EMAIL,
  DEV_ADMIN_ROLE_NAME,
  DEV_ORG_SLUG,
  DEV_SYSTEM_ADMIN_ROLE_NAME,
  seedDevAdminBootstrap,
} from './dev-admin-bootstrap';

dotenv.config({ path: path.resolve(__dirname, '../../../.env.development') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const LOCAL_DEFAULT =
  'postgresql://grubpac:grubpac_dev@localhost:5432/grubpac_erp';

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL ?? LOCAL_DEFAULT;
  if (
    process.env.APP_ENV === 'production' ||
    /rds\.amazonaws\.com/i.test(connectionString)
  ) {
    throw new Error(
      'Refusing to clean roles against production/RDS. Use local Docker DATABASE_URL only.',
    );
  }

  const pool = new Pool(pgPoolOptions(connectionString));
  const db = drizzle(pool, { schema });

  const adminRows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, DEV_ADMIN_EMAIL))
    .limit(1);
  const adminUserId = adminRows[0]?.id;
  if (!adminUserId) {
    throw new Error(
      `Admin user ${DEV_ADMIN_EMAIL} not found. Run npm run db:seed -w backend first.`,
    );
  }

  const deletedUsers = await db
    .delete(users)
    .where(ne(users.email, DEV_ADMIN_EMAIL))
    .returning({ id: users.id, email: users.email });

  const orgRows = await db
    .select({ id: schema.organizations.id })
    .from(schema.organizations)
    .where(eq(schema.organizations.slug, DEV_ORG_SLUG))
    .limit(1);
  const devOrgId = orgRows[0]?.id;

  const allRoles = await db
    .select({
      id: roles.id,
      name: roles.name,
      scope: roles.scope,
      organizationId: roles.organizationId,
    })
    .from(roles);

  const keepRoleIds = new Set<string>();
  for (const role of allRoles) {
    if (role.scope === 'system' && role.name === DEV_SYSTEM_ADMIN_ROLE_NAME) {
      keepRoleIds.add(role.id);
    }
    if (
      devOrgId != null &&
      role.organizationId === devOrgId &&
      role.name === DEV_ADMIN_ROLE_NAME
    ) {
      keepRoleIds.add(role.id);
    }
  }

  const roleIdsToDelete = allRoles
    .filter((role) => !keepRoleIds.has(role.id))
    .map((role) => role.id);

  const deletedRoles =
    roleIdsToDelete.length > 0
      ? await db
          .delete(roles)
          .where(inArray(roles.id, roleIdsToDelete))
          .returning({ id: roles.id, name: roles.name })
      : [];

  await seedDevAdminBootstrap(db);

  const systemRoles = await db
    .select({ id: roles.id, name: roles.name })
    .from(roles)
    .where(eq(roles.name, DEV_SYSTEM_ADMIN_ROLE_NAME));
  if (systemRoles.length > 1) {
    const [keep, ...dupes] = systemRoles;
    const dupeIds = dupes.map((r) => r.id);
    if (dupeIds.length > 0 && keep) {
      await db.delete(roles).where(inArray(roles.id, dupeIds));
    }
  }

  const remainingRoles = await db
    .select({ name: roles.name, scope: roles.scope })
    .from(roles);

  console.log(
    JSON.stringify(
      {
        connection: connectionString.replace(/:[^:@/]+@/, ':***@'),
        deletedUsers: deletedUsers.length,
        deletedUserEmails: deletedUsers.map((u) => u.email),
        deletedRoles: deletedRoles.length,
        deletedRoleNames: deletedRoles.map((r) => r.name),
        remainingRoles,
        adminEmail: DEV_ADMIN_EMAIL,
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
