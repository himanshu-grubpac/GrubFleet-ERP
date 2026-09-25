import { Inject, Injectable } from '@nestjs/common';
import { desc, eq, sql } from 'drizzle-orm';
import type { AppDatabase } from '../../database/database.module';
import { DRIZZLE } from '../../database/drizzle.tokens';
import { auditLogs } from '../../database/schema';

export type AuditLogInsert = {
  userId?: string | null;
  organizationId?: string | null;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  status?: string;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  correlationId?: string | null;
};

@Injectable()
export class AuditRepository {
  constructor(@Inject(DRIZZLE) private readonly db: AppDatabase) {}

  async insert(entry: AuditLogInsert): Promise<void> {
    await this.db.insert(auditLogs).values({
      userId: entry.userId ?? null,
      organizationId: entry.organizationId ?? null,
      action: entry.action,
      resourceType: entry.resourceType ?? null,
      resourceId: entry.resourceId ?? null,
      status: entry.status ?? 'SUCCESS',
      metadata: entry.metadata ?? null,
      ipAddress: entry.ipAddress ?? null,
      correlationId: entry.correlationId ?? null,
    });
  }

  async listForOrganization(
    organizationId: string,
    page: number,
    pageSize: number,
  ): Promise<{ rows: (typeof auditLogs.$inferSelect)[]; total: number }> {
    const offset = (page - 1) * pageSize;
    const where = eq(auditLogs.organizationId, organizationId);
    const [rows, countRows] = await Promise.all([
      this.db
        .select()
        .from(auditLogs)
        .where(where)
        .orderBy(desc(auditLogs.createdAt))
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(auditLogs)
        .where(where),
    ]);
    return { rows, total: countRows[0]?.count ?? 0 };
  }
}
