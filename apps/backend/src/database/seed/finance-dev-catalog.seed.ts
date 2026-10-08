import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../schema';
import { inventoryCatalogParts, organizations } from '../schema';
import { DEV_ORG_SLUG } from './dev-admin-bootstrap';

type AppDb = NodePgDatabase<typeof schema>;

const DEV_PARTS = [
  { name: 'Brake pad set', partCode: 'BP-001' },
  { name: 'Engine oil filter', partCode: 'OF-002' },
  { name: 'Spark plug', partCode: 'SP-003' },
] as const;

/** Idempotent spare-parts catalog for local Finance purchase invoices until Inventory module ships. */
export async function seedFinanceDevCatalogParts(db: AppDb): Promise<void> {
  const [org] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, DEV_ORG_SLUG))
    .limit(1);
  if (!org) return;

  for (const part of DEV_PARTS) {
    await db
      .insert(inventoryCatalogParts)
      .values({
        organizationId: org.id,
        name: part.name,
        partCode: part.partCode,
        isActive: true,
      })
      .onConflictDoNothing({
        target: [
          inventoryCatalogParts.organizationId,
          inventoryCatalogParts.name,
        ],
      });
  }
}
