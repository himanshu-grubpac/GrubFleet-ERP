import { and, eq, inArray } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../schema';
import { roles } from '../schema';

type AppDb = NodePgDatabase<typeof schema>;

/**
 * Deletes org roles by id (children before parents). user_roles / role_permissions
 * cascade on role delete.
 */
export async function deleteOrgRolesInTreeOrder(
  db: AppDb,
  organizationId: string,
  roleIds: string[],
): Promise<string[]> {
  if (roleIds.length === 0) {
    return [];
  }

  const idSet = new Set(roleIds);
  await db
    .update(roles)
    .set({ parentRoleId: null })
    .where(
      and(
        eq(roles.organizationId, organizationId),
        inArray(roles.parentRoleId, roleIds),
      ),
    );

  const rows = await db
    .select({ id: roles.id, parentRoleId: roles.parentRoleId })
    .from(roles)
    .where(
      and(
        eq(roles.organizationId, organizationId),
        inArray(roles.id, roleIds),
      ),
    );

  const deletedNames: string[] = [];
  const remaining = new Map(rows.map((r) => [r.id, r.parentRoleId]));

  while (remaining.size > 0) {
    const leafIds = [...remaining.keys()].filter((id) => {
      for (const [, parentId] of remaining) {
        if (parentId === id) {
          return false;
        }
      }
      return true;
    });

    if (leafIds.length === 0) {
      throw new Error(
        'Could not resolve role delete order (cycle or missing parent)',
      );
    }

    const removed = await db
      .delete(roles)
      .where(
        and(
          eq(roles.organizationId, organizationId),
          inArray(roles.id, leafIds),
        ),
      )
      .returning({ name: roles.name });

    for (const row of removed) {
      deletedNames.push(row.name);
    }
    for (const id of leafIds) {
      remaining.delete(id);
    }
  }

  return deletedNames;
}
