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

export const DEV_ADMIN_EMAIL = 'admin@grubpac.local';
export const DEV_ADMIN_PASSWORD = 'Grubpac123';
export const DEV_ORG_SLUG = 'grubpac-dev';
export const DEV_ORG_NAME = 'GrubPac Dev Organization';
export const DEV_ADMIN_ROLE_NAME = 'Organization Admin';
export const DEV_SYSTEM_ADMIN_ROLE_NAME = 'System Administrator';

type AppDb = NodePgDatabase<typeof schema>;

export async function seedDevAdminBootstrap(db: AppDb): Promise<void> {
  const passwordHash = await bcrypt.hash(DEV_ADMIN_PASSWORD, 12);

  const orgRows = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, DEV_ORG_SLUG))
    .limit(1);

  let organizationId = orgRows[0]?.id;
  if (!organizationId) {
    await db
      .insert(organizations)
      .values({
        name: DEV_ORG_NAME,
        slug: DEV_ORG_SLUG,
        isActive: true,
      })
      .onConflictDoNothing({ target: organizations.slug });

    const resolvedOrg = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, DEV_ORG_SLUG))
      .limit(1);
    organizationId = resolvedOrg[0]?.id;
  }

  if (!organizationId) {
    throw new Error('Failed to resolve dev organization id');
  }

  await db
    .insert(users)
    .values({
      email: DEV_ADMIN_EMAIL,
      passwordHash,
      fullName: 'Dev Admin',
      isActive: true,
      emailVerifiedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        passwordHash,
        fullName: 'Dev Admin',
        isActive: true,
        emailVerifiedAt: new Date(),
      },
    });

  const userRows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, DEV_ADMIN_EMAIL))
    .limit(1);
  const userId = userRows[0]?.id;
  if (!userId) {
    throw new Error('Failed to resolve dev admin user id');
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
        description: 'Dev bootstrap admin with provisional module permissions',
        isSystem: false,
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
