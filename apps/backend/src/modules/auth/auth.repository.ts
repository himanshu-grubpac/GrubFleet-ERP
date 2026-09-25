import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, isNull } from 'drizzle-orm';
import type { AppDatabase } from '../../database/database.module';
import { DRIZZLE } from '../../database/drizzle.tokens';
import {
  memberships,
  organizations,
  permissions,
  refreshTokens,
  rolePermissions,
  roles,
  userRoles,
  users,
} from '../../database/schema';

export type UserCredentialRow = {
  id: string;
  email: string;
  passwordHash: string | null;
  fullName: string | null;
  isActive: boolean;
};

export type RefreshTokenRow = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
};

export type MeProfile = {
  user: {
    id: string;
    email: string;
    fullName: string | null;
    isActive: boolean;
    emailVerifiedAt: Date | null;
  };
  memberships: Array<{
    organizationId: string;
    organizationName: string;
    organizationSlug: string;
    status: 'invited' | 'active' | 'suspended';
    joinedAt: Date | null;
    roles: Array<{
      id: string;
      name: string;
      scope: 'system' | 'organization';
    }>;
    permissionKeys: string[];
  }>;
  permissionKeys: string[];
};

@Injectable()
export class AuthRepository {
  constructor(@Inject(DRIZZLE) private readonly db: AppDatabase) {}

  async findUserByEmail(email: string): Promise<UserCredentialRow | null> {
    const rows = await this.db
      .select({
        id: users.id,
        email: users.email,
        passwordHash: users.passwordHash,
        fullName: users.fullName,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    return rows[0] ?? null;
  }

  async findUserById(userId: string): Promise<UserCredentialRow | null> {
    const rows = await this.db
      .select({
        id: users.id,
        email: users.email,
        passwordHash: users.passwordHash,
        fullName: users.fullName,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return rows[0] ?? null;
  }

  async insertRefreshToken(params: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    userAgent?: string | null;
    ipAddress?: string | null;
  }): Promise<void> {
    await this.db.insert(refreshTokens).values({
      userId: params.userId,
      tokenHash: params.tokenHash,
      expiresAt: params.expiresAt,
      userAgent: params.userAgent ?? null,
      ipAddress: params.ipAddress ?? null,
    });
  }

  async findValidRefreshTokenByHash(
    tokenHash: string,
  ): Promise<RefreshTokenRow | null> {
    const now = new Date();
    const rows = await this.db
      .select({
        id: refreshTokens.id,
        userId: refreshTokens.userId,
        tokenHash: refreshTokens.tokenHash,
        expiresAt: refreshTokens.expiresAt,
        revokedAt: refreshTokens.revokedAt,
      })
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.tokenHash, tokenHash),
          isNull(refreshTokens.revokedAt),
          gt(refreshTokens.expiresAt, now),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async revokeRefreshTokenById(tokenId: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, tokenId));
  }

  async revokeAllRefreshTokensForUser(userId: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)),
      );
  }

  async revokeRefreshTokenByHash(tokenHash: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.tokenHash, tokenHash));
  }

  async getMeProfile(userId: string): Promise<MeProfile | null> {
    const userRows = await this.db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        isActive: users.isActive,
        emailVerifiedAt: users.emailVerifiedAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const user = userRows[0];
    if (!user) {
      return null;
    }

    const membershipRows = await this.db
      .select({
        organizationId: memberships.organizationId,
        organizationName: organizations.name,
        organizationSlug: organizations.slug,
        status: memberships.status,
        joinedAt: memberships.joinedAt,
      })
      .from(memberships)
      .innerJoin(
        organizations,
        eq(memberships.organizationId, organizations.id),
      )
      .where(eq(memberships.userId, userId));

    const roleAssignmentRows = await this.db
      .select({
        roleId: roles.id,
        roleName: roles.name,
        roleScope: roles.scope,
        organizationId: userRoles.organizationId,
        permissionKey: permissions.key,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .leftJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
      .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(userRoles.userId, userId));

    const globalPermissionKeys = new Set<string>();
    const membershipDtos = membershipRows.map((m) => {
      const rolesForOrg = new Map<
        string,
        { id: string; name: string; scope: 'system' | 'organization' }
      >();
      const orgPermissionKeys = new Set<string>();

      for (const row of roleAssignmentRows) {
        const appliesToOrg =
          row.organizationId === null ||
          row.organizationId === m.organizationId;
        if (!appliesToOrg) {
          continue;
        }
        rolesForOrg.set(row.roleId, {
          id: row.roleId,
          name: row.roleName,
          scope: row.roleScope,
        });
        if (row.permissionKey) {
          orgPermissionKeys.add(row.permissionKey);
          globalPermissionKeys.add(row.permissionKey);
        }
      }

      return {
        organizationId: m.organizationId,
        organizationName: m.organizationName,
        organizationSlug: m.organizationSlug,
        status: m.status,
        joinedAt: m.joinedAt,
        roles: [...rolesForOrg.values()],
        permissionKeys: [...orgPermissionKeys].sort(),
      };
    });

    return {
      user,
      memberships: membershipDtos,
      permissionKeys: [...globalPermissionKeys].sort(),
    };
  }

  /** Used by integration tests to detect DB availability. */
  async ping(): Promise<boolean> {
    try {
      await this.db.select({ id: users.id }).from(users).limit(1);
      return true;
    } catch {
      return false;
    }
  }
}
