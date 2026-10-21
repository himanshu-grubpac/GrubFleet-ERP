import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, sql, type AnyColumn } from 'drizzle-orm';
import {
  buildListOrderBy,
  type ResolvedListSort,
} from '../../common/utils/list-sort.util';
import {
  ORGANIZATION_LIST_DEFAULT_SORT,
  type OrganizationListSortField,
} from './constants/organizations-list-sort.constants';
import type { AppDatabase } from '../../database/database.module';
import { DRIZZLE } from '../../database/drizzle.tokens';
import { memberships, organizations } from '../../database/schema';

const ORGANIZATION_LIST_SORT_COLUMNS: Record<
  OrganizationListSortField,
  AnyColumn
> = {
  name: organizations.name,
  createdAt: organizations.createdAt,
};

@Injectable()
export class OrganizationsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: AppDatabase) {}

  async listForUser(
    userId: string,
    page: number,
    pageSize: number,
    systemAccess: boolean,
    sort?: ResolvedListSort<OrganizationListSortField>,
  ): Promise<{ rows: (typeof organizations.$inferSelect)[]; total: number }> {
    const offset = (page - 1) * pageSize;

    if (systemAccess) {
      const [rows, countRows] = await Promise.all([
        this.db
          .select()
          .from(organizations)
          .orderBy(
            ...buildListOrderBy(
              ORGANIZATION_LIST_SORT_COLUMNS,
              sort ?? ORGANIZATION_LIST_DEFAULT_SORT,
              organizations.id,
            ),
          )
          .limit(pageSize)
          .offset(offset),
        this.db
          .select({ count: sql<number>`count(*)::int` })
          .from(organizations),
      ]);
      return { rows, total: countRows[0]?.count ?? 0 };
    }

    const memberOrgIds = await this.db
      .select({ organizationId: memberships.organizationId })
      .from(memberships)
      .where(
        and(eq(memberships.userId, userId), eq(memberships.status, 'active')),
      );

    const orgIds = memberOrgIds.map((m) => m.organizationId);
    if (orgIds.length === 0) {
      return { rows: [], total: 0 };
    }

    const [rows, countRows] = await Promise.all([
      this.db
        .select()
        .from(organizations)
        .where(inArray(organizations.id, orgIds))
        .orderBy(
          ...buildListOrderBy(
            ORGANIZATION_LIST_SORT_COLUMNS,
            sort ?? ORGANIZATION_LIST_DEFAULT_SORT,
            organizations.id,
          ),
        )
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(organizations)
        .where(inArray(organizations.id, orgIds)),
    ]);

    return { rows, total: countRows[0]?.count ?? 0 };
  }

  async findById(
    organizationId: string,
  ): Promise<typeof organizations.$inferSelect | null> {
    const rows = await this.db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);
    return rows[0] ?? null;
  }
}
