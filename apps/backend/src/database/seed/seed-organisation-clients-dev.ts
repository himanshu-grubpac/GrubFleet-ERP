/**
 * Dev-only: idempotent sample organisation clients with POCs.
 *
 *   npm run seed:dev:organisation-clients -w backend
 */
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { pgPoolOptions } from '../pg-pool-options';
import * as schema from '../schema';
import { organisationClientPocs, organisationClients } from '../schema';
import {
  assertDevOnly,
  maskDatabaseUrl,
  resolveDevDatabaseUrl,
  resolveDevOrganizationId,
} from './organisation-dev-data-guards';

export const DEV_SEED_CLIENT_EMAIL_DOMAIN = '@grubpac.local';
export const DEV_SEED_CLIENT_EMAIL_PREFIX = 'dev.seed.client.';
export const DEV_SEED_CLIENT_NAME_PREFIX = 'Dev Seed Client';

export function isDevSeedClientMarker(row: {
  name: string;
  primaryEmail?: string;
}): boolean {
  if (row.name.startsWith(DEV_SEED_CLIENT_NAME_PREFIX)) {
    return true;
  }
  const email = row.primaryEmail?.trim().toLowerCase() ?? '';
  return (
    email.startsWith(DEV_SEED_CLIENT_EMAIL_PREFIX.toLowerCase()) &&
    email.endsWith(DEV_SEED_CLIENT_EMAIL_DOMAIN.toLowerCase())
  );
}

type ClientSeedRow = {
  seedKey: string;
  name: string;
  addressLine1: string;
  addressCity?: string;
  addressState: string;
  addressDistrict: string;
  addressPincode: string;
  addressCountry: string;
  isActive: boolean;
  pocName: string;
  pocPhone: string;
  pocEmail: string;
};

const CLIENT_SEEDS: ClientSeedRow[] = [
  {
    seedKey: 'logistics_in',
    name: 'Dev Seed Client — Meridian Logistics Pvt Ltd',
    addressLine1: '12 Industrial Estate',
    addressCity: 'Pune',
    addressState: 'Maharashtra',
    addressDistrict: 'Pune',
    addressPincode: '411001',
    addressCountry: 'IN',
    isActive: true,
    pocName: 'Aditi Rao',
    pocPhone: '+919876543201',
    pocEmail: `${DEV_SEED_CLIENT_EMAIL_PREFIX}meridian${DEV_SEED_CLIENT_EMAIL_DOMAIN}`,
  },
  {
    seedKey: 'fleet_us',
    name: 'Dev Seed Client — NorthStar Fleet Co (US)',
    addressLine1: '850 Battery Street',
    addressCity: 'San Francisco',
    addressState: 'California',
    addressDistrict: 'San Francisco',
    addressPincode: '94111',
    addressCountry: 'US',
    isActive: true,
    pocName: 'James Carter',
    pocPhone: '+14155552671',
    pocEmail: `${DEV_SEED_CLIENT_EMAIL_PREFIX}northstar${DEV_SEED_CLIENT_EMAIL_DOMAIN}`,
  },
  {
    seedKey: 'inactive_in',
    name: 'Dev Seed Client — Sunset Couriers (inactive)',
    addressLine1: '44 Ring Road',
    addressCity: 'Ahmedabad',
    addressState: 'Gujarat',
    addressDistrict: 'Ahmedabad',
    addressPincode: '380001',
    addressCountry: 'IN',
    isActive: false,
    pocName: 'Priya Shah',
    pocPhone: '+919876543299',
    pocEmail: `${DEV_SEED_CLIENT_EMAIL_PREFIX}sunset${DEV_SEED_CLIENT_EMAIL_DOMAIN}`,
  },
];

export const DEV_SEED_CLIENT_EXPECTED_COUNT = CLIENT_SEEDS.length;

async function main(): Promise<void> {
  const connectionString = resolveDevDatabaseUrl();
  assertDevOnly(connectionString);

  const pool = new Pool(pgPoolOptions(connectionString));
  const db = drizzle(pool, { schema });

  const devOrgId = await resolveDevOrganizationId(db);

  let inserted = 0;
  let skipped = 0;

  for (const seed of CLIENT_SEEDS) {
    const existingPoc = await db
      .select({
        id: organisationClientPocs.id,
        clientId: organisationClientPocs.clientId,
      })
      .from(organisationClientPocs)
      .innerJoin(
        organisationClients,
        eq(organisationClientPocs.clientId, organisationClients.id),
      )
      .where(
        and(
          eq(organisationClients.organizationId, devOrgId),
          eq(organisationClientPocs.email, seed.pocEmail),
        ),
      )
      .limit(1);

    if (existingPoc.length > 0) {
      skipped += 1;
      continue;
    }

    const [client] = await db
      .insert(organisationClients)
      .values({
        organizationId: devOrgId,
        name: seed.name,
        addressLine1: seed.addressLine1,
        addressCity: seed.addressCity ?? null,
        addressState: seed.addressState,
        addressDistrict: seed.addressDistrict,
        addressPincode: seed.addressPincode,
        addressCountry: seed.addressCountry,
        isActive: seed.isActive,
      })
      .returning();

    await db.insert(organisationClientPocs).values({
      clientId: client.id,
      name: seed.pocName,
      contactNumber: seed.pocPhone,
      email: seed.pocEmail,
      isPrimary: true,
      sortOrder: 0,
    });
    inserted += 1;
  }

  console.log(
    `Dev organisation clients seed complete (org=${devOrgId}, db=${maskDatabaseUrl(connectionString)}).`,
  );
  console.log(`Inserted: ${inserted}, skipped (already present): ${skipped}.`);

  await pool.end();
}

if (require.main === module) {
  main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
