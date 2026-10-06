import { eq } from 'drizzle-orm';
import type { AppDatabase } from '../../src/database/database.module';
import { roles } from '../../src/database/schema';
import {
  isJunkIntegrationOrgRoleName,
  RBAC_INTEGRATION_TEST_ROLE_PREFIX,
} from '../../src/database/seed/dev-role-data-policy';
import { deleteOrgRolesInTreeOrder } from '../../src/database/seed/purge-org-roles-dev';

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
