import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import type { AppDatabase } from '../../../database/database.module';
import { DRIZZLE } from '../../../database/drizzle.tokens';
import {
  memberships,
  permissions,
  rolePermissions,
  roles,
  userRoles,
} from '../../../database/schema';

@Injectable()
export class AuthorizationRepository {
  constructor(@Inject(DRIZZLE) private readonly db: AppDatabase) {}

  async hasActiveMembership(
    userId: string,
    organizationId: string,
  ): Promise<boolean> {
    const rows = await this.db
      .select({ id: memberships.id })
      .from(memberships)
      .where(
        and(
          eq(memberships.userId, userId),
          eq(memberships.organizationId, organizationId),
          eq(memberships.status, 'active'),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  async userHasSystemScopeRole(userId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: userRoles.id })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(
        and(
          eq(userRoles.userId, userId),
          eq(roles.scope, 'system'),
          isNull(userRoles.organizationId),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  async loadEffectivePermissionKeys(
    userId: string,
    organizationId: string,
  ): Promise<string[]> {
    const rows = await this.db
      .select({ permissionKey: permissions.key })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .innerJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(
        and(
          eq(userRoles.userId, userId),
          or(
            isNull(userRoles.organizationId),
            eq(userRoles.organizationId, organizationId),
          ),
        ),
      );

    const keys = new Set<string>();
    for (const row of rows) {
      if (row.permissionKey) {
        keys.add(row.permissionKey);
      }
    }
    return [...keys].sort();
  }

  async findPermissionIdsByKeys(keys: string[]): Promise<Map<string, string>> {
    if (keys.length === 0) {
      return new Map();
    }
    const rows = await this.db
      .select({ id: permissions.id, key: permissions.key })
      .from(permissions)
      .where(inArray(permissions.key, keys));
    return new Map(rows.map((r) => [r.key, r.id]));
  }

  async countPermissionsInCatalog(): Promise<number> {
    const rows = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(permissions);
    return rows[0]?.count ?? 0;
  }

  async userHoldsAllCatalogPermissions(
    userId: string,
    organizationId: string,
  ): Promise<boolean> {
    const total = await this.countPermissionsInCatalog();
    if (total === 0) {
      return false;
    }
    const held = await this.loadEffectivePermissionKeys(userId, organizationId);
    return held.length >= total;
  }
}
