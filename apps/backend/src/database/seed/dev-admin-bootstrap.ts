import * as bcrypt from 'bcrypt';
import { and, eq, isNull } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../schema';
import {
  memberships,
  organizations,
  permissions,
  rolePermissions,
  roles,
  userRoles,
  users,
} from '../schema';
import { buildPhase1PermissionCatalog } from './permission-catalog';
import { seedFinanceDevCatalogParts } from './finance-dev-catalog.seed';
import { seedInventoryDevData } from './inventory-dev.seed';

export const DEV_ADMIN_EMAIL = 'admin@grubpac.local';
export const DEV_ADMIN_PASSWORD = 'Grubpac123';
export const DEV_ORG_SLUG = 'grubpac-dev';
export const DEV_ORG_NAME = 'GrubPac Dev Organization';
export const DEV_ADMIN_ROLE_NAME = 'Organization Admin';
export const DEV_SYSTEM_ADMIN_ROLE_NAME = 'System Administrator';

type AppDb = NodePgDatabase<typeof schema>;

export type SeedOrganizationAdminUserInput = {
  email: string;
  password: string;
  fullName: string;
  orgSlug?: string;
  orgName?: string;
};

/** Org admin + system admin roles; no finance/inventory/demo catalog. */
export async function seedOrganizationAdminUser(
  db: AppDb,
  input: SeedOrganizationAdminUserInput,
): Promise<void> {
  const orgSlug = input.orgSlug ?? DEV_ORG_SLUG;
  const orgName = input.orgName ?? DEV_ORG_NAME;
  const passwordHash = await bcrypt.hash(input.password, 12);

  const orgRows = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, orgSlug))
    .limit(1);

  let organizationId = orgRows[0]?.id;
  if (!organizationId) {
    await db
      .insert(organizations)
      .values({
        name: orgName,
        slug: orgSlug,
        isActive: true,
      })
      .onConflictDoNothing({ target: organizations.slug });

    const resolvedOrg = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, orgSlug))
      .limit(1);
    organizationId = resolvedOrg[0]?.id;
  }

  if (!organizationId) {
    throw new Error('Failed to resolve organization id');
  }

  const normalizedEmail = input.email.trim().toLowerCase();

  await db
    .insert(users)
    .values({
      email: normalizedEmail,
      passwordHash,
      fullName: input.fullName,
      isActive: true,
      emailVerifiedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        passwordHash,
        fullName: input.fullName,
        isActive: true,
        emailVerifiedAt: new Date(),
      },
    });

  const userRows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);
  const userId = userRows[0]?.id;
  if (!userId) {
    throw new Error('Failed to resolve user id');
  }

  await db
    .insert(memberships)
    .values({
      userId,
      organizationId,
      status: 'active',
      joinedAt: new Date(),
    })
    .onConflictDoNothing({
      target: [memberships.userId, memberships.organizationId],
    });

  const roleRows = await db
    .select({ id: roles.id })
    .from(roles)
    .where(
      and(
        eq(roles.name, DEV_ADMIN_ROLE_NAME),
        eq(roles.organizationId, organizationId),
      ),
    )
    .limit(1);

  let roleId = roleRows[0]?.id;
  if (!roleId) {
    await db
      .insert(roles)
      .values({
        organizationId,
        name: DEV_ADMIN_ROLE_NAME,
        scope: 'organization',
        description:
          'Default organization administrator (seeded; not editable)',
        isSystem: true,
      })
      .onConflictDoNothing({
        target: [roles.organizationId, roles.name],
      });

    const resolvedRole = await db
      .select({ id: roles.id })
      .from(roles)
      .where(
        and(
          eq(roles.name, DEV_ADMIN_ROLE_NAME),
          eq(roles.organizationId, organizationId),
        ),
      )
      .limit(1);
    roleId = resolvedRole[0]?.id;
  }

  if (!roleId) {
    throw new Error('Failed to resolve dev admin role id');
  }

  await db
    .update(roles)
    .set({
      isSystem: true,
      description: 'Default organization administrator (seeded; not editable)',
    })
    .where(eq(roles.id, roleId));

  const permissionRows = await db
    .select({ id: permissions.id, key: permissions.key })
    .from(permissions);

  for (const perm of permissionRows) {
    await db
      .insert(rolePermissions)
      .values({ roleId, permissionId: perm.id })
      .onConflictDoNothing({
        target: [rolePermissions.roleId, rolePermissions.permissionId],
      });
  }

  await db
    .insert(userRoles)
    .values({
      userId,
      roleId,
      organizationId,
    })
    .onConflictDoNothing({
      target: [userRoles.userId, userRoles.roleId, userRoles.organizationId],
    });

  const systemRoleRows = await db
    .select({ id: roles.id })
    .from(roles)
    .where(
      and(
        eq(roles.name, DEV_SYSTEM_ADMIN_ROLE_NAME),
        isNull(roles.organizationId),
        eq(roles.scope, 'system'),
      ),
    )
    .limit(1);

  let systemRoleId = systemRoleRows[0]?.id;
  if (!systemRoleId) {
    await db
      .insert(roles)
      .values({
        organizationId: null,
        name: DEV_SYSTEM_ADMIN_ROLE_NAME,
        scope: 'system',
        description: 'System-wide administrator (delegation bypass)',
        isSystem: true,
      })
      .onConflictDoNothing({
        target: [roles.organizationId, roles.name],
      });

    const resolvedSystemRole = await db
      .select({ id: roles.id })
      .from(roles)
      .where(
        and(
          eq(roles.name, DEV_SYSTEM_ADMIN_ROLE_NAME),
          isNull(roles.organizationId),
          eq(roles.scope, 'system'),
        ),
      )
      .limit(1);
    systemRoleId = resolvedSystemRole[0]?.id;
  }

  if (systemRoleId) {
    for (const perm of permissionRows) {
      await db
        .insert(rolePermissions)
        .values({ roleId: systemRoleId, permissionId: perm.id })
        .onConflictDoNothing({
          target: [rolePermissions.roleId, rolePermissions.permissionId],
        });
    }

    await db
      .insert(userRoles)
      .values({
        userId,
        roleId: systemRoleId,
        organizationId: null,
      })
      .onConflictDoNothing({
        target: [userRoles.userId, userRoles.roleId, userRoles.organizationId],
      });
  }
}

export async function seedDevAdminBootstrap(db: AppDb): Promise<void> {
  const catalog = buildPhase1PermissionCatalog();
  for (const item of catalog) {
    await db
      .insert(permissions)
      .values({
        key: item.key,
        module: item.module,
        action: item.action,
        kind: item.kind,
        description: item.description,
      })
      .onConflictDoUpdate({
        target: permissions.key,
        set: {
          module: item.module,
          action: item.action,
          kind: item.kind,
          description: item.description,
        },
      });
  }

  await seedOrganizationAdminUser(db, {
    email: DEV_ADMIN_EMAIL,
    password: DEV_ADMIN_PASSWORD,
    fullName: 'Dev Admin',
  });

  await seedFinanceDevCatalogParts(db);
  await seedInventoryDevData(db);
}
