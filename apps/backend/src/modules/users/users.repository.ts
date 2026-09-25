import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import type { AppDatabase } from '../../database/database.module';
import { DRIZZLE } from '../../database/drizzle.tokens';
import { memberships, users } from '../../database/schema';

@Injectable()
export class UsersRepository {
  constructor(@Inject(DRIZZLE) private readonly db: AppDatabase) {}

  async listMembersInOrg(
    organizationId: string,
    page: number,
    pageSize: number,
  ): Promise<{
    rows: Array<{
      id: string;
      email: string;
      fullName: string | null;
      isActive: boolean;
      membershipStatus: 'invited' | 'active' | 'suspended';
      joinedAt: Date | null;
    }>;
    total: number;
  }> {
    const offset = (page - 1) * pageSize;
    const rows = await this.db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        isActive: users.isActive,
        membershipStatus: memberships.status,
        joinedAt: memberships.joinedAt,
      })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .where(eq(memberships.organizationId, organizationId))
      .orderBy(users.email)
      .limit(pageSize)
      .offset(offset);

    const countRows = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(memberships)
      .where(eq(memberships.organizationId, organizationId));

    return { rows, total: countRows[0]?.count ?? 0 };
  }

  async findUserInOrg(
    userId: string,
    organizationId: string,
  ): Promise<{
    id: string;
    email: string;
    fullName: string | null;
    isActive: boolean;
    membershipStatus: 'invited' | 'active' | 'suspended';
    joinedAt: Date | null;
  } | null> {
    const rows = await this.db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        isActive: users.isActive,
        membershipStatus: memberships.status,
        joinedAt: memberships.joinedAt,
      })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .where(
        and(
          eq(memberships.organizationId, organizationId),
          eq(users.id, userId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async findUserByEmail(email: string): Promise<{ id: string } | null> {
    const rows = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    return rows[0] ?? null;
  }

  async insertUser(params: {
    email: string;
    passwordHash: string;
    fullName?: string | null;
    isActive: boolean;
  }): Promise<{ id: string; email: string }> {
    const inserted = await this.db
      .insert(users)
      .values({
        email: params.email.toLowerCase(),
        passwordHash: params.passwordHash,
        fullName: params.fullName ?? null,
        isActive: params.isActive,
        emailVerifiedAt: null,
      })
      .returning({ id: users.id, email: users.email });
    const row = inserted[0];
    if (!row) {
      throw new Error('Failed to insert user');
    }
    return row;
  }

  async upsertMembership(params: {
    userId: string;
    organizationId: string;
    status: 'invited' | 'active' | 'suspended';
  }): Promise<void> {
    await this.db
      .insert(memberships)
      .values({
        userId: params.userId,
        organizationId: params.organizationId,
        status: params.status,
        joinedAt: params.status === 'active' ? new Date() : null,
      })
      .onConflictDoUpdate({
        target: [memberships.userId, memberships.organizationId],
        set: {
          status: params.status,
          updatedAt: new Date(),
        },
      });
  }

  async updateUser(
    userId: string,
    patch: { fullName?: string; isActive?: boolean },
  ): Promise<void> {
    await this.db
      .update(users)
      .set({
        ...(patch.fullName !== undefined ? { fullName: patch.fullName } : {}),
        ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }
}
