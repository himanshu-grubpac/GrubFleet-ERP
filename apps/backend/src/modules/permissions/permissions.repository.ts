import { Inject, Injectable } from '@nestjs/common';
import { sql, type AnyColumn } from 'drizzle-orm';
import {
  buildListOrderBy,
  type ResolvedListSort,
} from '../../common/utils/list-sort.util';
import {
  PERMISSION_CATALOG_LIST_DEFAULT_SORT,
  type PermissionCatalogListSortField,
} from './constants/permissions-list-sort.constants';
import type { AppDatabase } from '../../database/database.module';
import { DRIZZLE } from '../../database/drizzle.tokens';
import { permissions } from '../../database/schema';

const PERMISSION_CATALOG_LIST_SORT_COLUMNS: Record<
  PermissionCatalogListSortField,
  AnyColumn
> = {
  module: permissions.module,
  key: permissions.key,
};

@Injectable()
export class PermissionsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: AppDatabase) {}

  async listCatalog(
    page: number,
    pageSize: number,
    sort?: ResolvedListSort<PermissionCatalogListSortField>,
  ): Promise<{
    rows: (typeof permissions.$inferSelect)[];
    total: number;
  }> {
    const offset = (page - 1) * pageSize;
    const [rows, countRows] = await Promise.all([
      this.db
        .select()
        .from(permissions)
        .orderBy(
          ...buildListOrderBy(
            PERMISSION_CATALOG_LIST_SORT_COLUMNS,
            sort ?? PERMISSION_CATALOG_LIST_DEFAULT_SORT,
            permissions.id,
          ),
        )
        .limit(pageSize)
        .offset(offset),
      this.db.select({ count: sql<number>`count(*)::int` }).from(permissions),
    ]);
    return { rows, total: countRows[0]?.count ?? 0 };
  }
}
