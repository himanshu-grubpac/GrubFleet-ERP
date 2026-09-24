import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { AppDatabase } from '../../database/database.module';
import { DRIZZLE } from '../../database/drizzle.tokens';
import { permissions } from '../../database/schema';

@Injectable()
export class PermissionsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: AppDatabase) {}

  async listCatalog(
    page: number,
    pageSize: number,
  ): Promise<{
    rows: (typeof permissions.$inferSelect)[];
    total: number;
  }> {
    const offset = (page - 1) * pageSize;
    const [rows, countRows] = await Promise.all([
      this.db
        .select()
        .from(permissions)
        .orderBy(permissions.module, permissions.key)
        .limit(pageSize)
        .offset(offset),
      this.db.select({ count: sql<number>`count(*)::int` }).from(permissions),
    ]);
    return { rows, total: countRows[0]?.count ?? 0 };
  }
}
