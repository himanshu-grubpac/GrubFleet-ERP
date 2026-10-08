import { and, eq, inArray } from 'drizzle-orm';
import type { AppDatabase } from '../../src/database/database.module';
import { roles, users } from '../../src/database/schema';
import {
  isJunkIntegrationOrgRoleName,
  RBAC_INTEGRATION_TEST_ROLE_PREFIX,
} from '../../src/database/seed/dev-role-data-policy';
import { deleteOrgRolesInTreeOrder } from '../../src/database/seed/purge-org-roles-dev';

export const RBAC_INTEGRATION_MANAGE_TIER_OPERATOR_EMAIL =
  'admin.manage.op@grubpac.local';
export const RBAC_INTEGRATION_MANAGE_TIER_CREATED_USER_EMAIL =
  'created.by.manage@grubpac.local';
export const RBAC_INTEGRATION_HIERARCHY_OPERATOR_EMAIL =
  'hierarchy.op@grubpac.local';

export const RBAC_INTEGRATION_EPHEMERAL_USER_EMAILS = [
  RBAC_INTEGRATION_MANAGE_TIER_OPERATOR_EMAIL,
  RBAC_INTEGRATION_MANAGE_TIER_CREATED_USER_EMAIL,
  RBAC_INTEGRATION_HIERARCHY_OPERATOR_EMAIL,
] as const;

/** Delete integration-test users by email (memberships / user_roles cascade). */
export async function deleteIntegrationTestUsersByEmails(
  db: AppDatabase,
  emails: readonly string[],
): Promise<string[]> {
  if (emails.length === 0) {
    return [];
  }

  const deleted = await db
    .delete(users)
    .where(inArray(users.email, [...emails]))
    .returning({ email: users.email });

  return deleted.map((row) => row.email);
}

/** Delete a single org role by name if it exists (children before parents). */
export async function deleteOrgRoleByNameIfExists(
  db: AppDatabase,
  organizationId: string,
  roleName: string,
): Promise<string[]> {
  const row = (
    await db
      .select({ id: roles.id })
      .from(roles)
      .where(
        and(eq(roles.organizationId, organizationId), eq(roles.name, roleName)),
      )
      .limit(1)
  )[0];

  if (!row) {
    return [];
  }

  return deleteOrgRolesInTreeOrder(db, organizationId, [row.id]);
}

/** Remove roles created by RBAC integration tests (stable prefix + legacy timestamp junk). */
export async function purgeRbacIntegrationTestRoles(
  db: AppDatabase,
  organizationId: string,
): Promise<string[]> {
  const orgRoleRows = await db
    .select({ id: roles.id, name: roles.name })
    .from(roles)
    .where(eq(roles.organizationId, organizationId));

  const toDelete = orgRoleRows
    .filter(
      (role) =>
        role.name.startsWith(RBAC_INTEGRATION_TEST_ROLE_PREFIX) ||
        isJunkIntegrationOrgRoleName(role.name),
    )
    .map((role) => role.id);

  if (toDelete.length === 0) {
    return [];
  }

  return deleteOrgRolesInTreeOrder(db, organizationId, toDelete);
}
