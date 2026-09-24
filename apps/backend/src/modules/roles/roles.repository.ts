import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, sql } from 'drizzle-orm';
import type { AppDatabase } from '../../database/database.module';
import { DRIZZLE } from '../../database/drizzle.tokens';
import {
  permissions,
  rolePermissions,
  roles,
  userRoles,
} from '../../database/schema';

@Injectable()
export class RolesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: AppDatabase) {}

  async listOrgRoles(
    organizationId: string,
    page: number,
    pageSize: number,
  ): Promise<{ rows: (typeof roles.$inferSelect)[]; total: number }> {
    const offset = (page - 1) * pageSize;
    const [rows, countRows] = await Promise.all([
      this.db
        .select()
        .from(roles)
        .where(
          and(
            eq(roles.organizationId, organizationId),
            eq(roles.scope, 'organization'),
          ),
        )
        .orderBy(roles.name)
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(roles)
        .where(
          and(
            eq(roles.organizationId, organizationId),
            eq(roles.scope, 'organization'),
          ),
        ),
    ]);
    return { rows, total: countRows[0]?.count ?? 0 };
  }

  async findOrgRoleById(
    roleId: string,
    organizationId: string,
  ): Promise<typeof roles.$inferSelect | null> {
    const rows = await this.db
      .select()
      .from(roles)
      .where(
        and(
          eq(roles.id, roleId),
          eq(roles.organizationId, organizationId),
          eq(roles.scope, 'organization'),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async getPermissionKeysForRole(roleId: string): Promise<string[]> {
    const rows = await this.db
      .select({ key: permissions.key })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, roleId));
    return rows.map((r) => r.key);
  }

  async insertRole(params: {
    organizationId: string;
    name: string;
    description?: string | null;
  }): Promise<typeof roles.$inferSelect> {
    const inserted = await this.db
      .insert(roles)
      .values({
        organizationId: params.organizationId,
        name: params.name,
        description: params.description ?? null,
        scope: 'organization',
        isSystem: false,
      })
      .returning();
    const row = inserted[0];
    if (!row) {
      throw new Error('Failed to insert role');
    }
    return row;
  }

  async updateRoleFields(
    roleId: string,
    patch: { name?: string; description?: string | null },
  ): Promise<void> {
    await this.db
      .update(roles)
      .set({
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.description !== undefined
          ? { description: patch.description }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(roles.id, roleId));
  }

  async replaceRolePermissions(
    roleId: string,
    permissionIds: string[],
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .delete(rolePermissions)
        .where(eq(rolePermissions.roleId, roleId));
      if (permissionIds.length === 0) {
        return;
      }
      await tx.insert(rolePermissions).values(
        permissionIds.map((permissionId) => ({
          roleId,
          permissionId,
        })),
      );
    });
  }

  async assignRoleToUser(params: {
    userId: string;
    roleId: string;
    organizationId: string;
  }): Promise<void> {
    await this.db
      .insert(userRoles)
      .values({
        userId: params.userId,
        roleId: params.roleId,
        organizationId: params.organizationId,
      })
      .onConflictDoNothing({
        target: [userRoles.userId, userRoles.roleId, userRoles.organizationId],
      });
  }

  async removeRoleAssignment(params: {
    userId: string;
    roleId: string;
    organizationId: string;
  }): Promise<boolean> {
    const deleted = await this.db
      .delete(userRoles)
      .where(
        and(
          eq(userRoles.userId, params.userId),
          eq(userRoles.roleId, params.roleId),
          eq(userRoles.organizationId, params.organizationId),
        ),
      )
      .returning({ id: userRoles.id });
    return deleted.length > 0;
  }

  async findPermissionIdsByKeys(keys: string[]): Promise<string[]> {
    if (keys.length === 0) {
      return [];
    }
    const rows = await this.db
      .select({ id: permissions.id })
      .from(permissions)
      .where(inArray(permissions.key, keys));
    return rows.map((r) => r.id);
  }
}
