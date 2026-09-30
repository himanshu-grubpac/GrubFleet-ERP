import { and, desc, eq } from 'drizzle-orm';
import type { AppDatabase } from '../../src/database/database.module';
import { auditLogs } from '../../src/database/schema';

export type AuditLogCriteria = {
  action: string;
  resourceId: string;
  organizationId?: string;
};

export type AuditLogRow = typeof auditLogs.$inferSelect;

export async function findLatestAuditLog(
  db: AppDatabase,
  criteria: AuditLogCriteria,
): Promise<AuditLogRow | undefined> {
  const conditions = [
    eq(auditLogs.action, criteria.action),
    eq(auditLogs.resourceId, criteria.resourceId),
  ];
  if (criteria.organizationId) {
    conditions.push(eq(auditLogs.organizationId, criteria.organizationId));
  }
  const [row] = await db
    .select()
    .from(auditLogs)
    .where(and(...conditions))
    .orderBy(desc(auditLogs.createdAt))
    .limit(1);
  return row;
}

/** Throws when no matching audit row exists; returns it for metadata asserts. */
export async function expectAuditLog(
  db: AppDatabase,
  criteria: AuditLogCriteria,
): Promise<AuditLogRow> {
  const row = await findLatestAuditLog(db, criteria);
  if (!row) {
    throw new Error(
      `Expected audit log ${criteria.action} for resource ${criteria.resourceId}`,
    );
  }
  return row;
}
