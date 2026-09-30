/**
 * Dev-only: wipe org-scoped employees + locations for the seeded dev org, then insert
 * realistic India-first sample data (~6 locations, ~6 employees).
 *
 * Run (local Docker Postgres):
 *   npm run seed:dev:organisation-data -w backend
 *
 * Requires: npm run db:seed -w backend (dev org + admin) and migrations applied.
 */
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { pgPoolOptions } from '../pg-pool-options';
import * as schema from '../schema';
import {
  organisationEmployees,
  organisationLocations,
  organisationLocationTypes,
} from '../schema';
import { SYSTEM_LOCATION_TYPE_PRESETS } from '../../modules/organisation/constants/system-location-type-presets';
import {
  assertDevOnly,
  cleanDevOrganisationEmployeesAndLocations,
  cleanDevRbacTestArtifacts,
  maskDatabaseUrl,
  resolveDevDatabaseUrl,
  resolveDevOrganizationId,
} from './organisation-dev-data-guards';

async function ensureSystemLocationTypes(
  db: ReturnType<typeof drizzle<typeof schema>>,
  organizationId: string,
): Promise<Map<string, string>> {
  for (const preset of SYSTEM_LOCATION_TYPE_PRESETS) {
    await db
      .insert(organisationLocationTypes)
      .values({
        organizationId,
        name: preset.name,
        presetKey: preset.presetKey,
        isSystem: true,
      })
      .onConflictDoNothing({
        target: [
          organisationLocationTypes.organizationId,
          organisationLocationTypes.presetKey,
        ],
      });
  }

  const rows = await db
    .select({
      id: organisationLocationTypes.id,
      presetKey: organisationLocationTypes.presetKey,
    })
    .from(organisationLocationTypes)
    .where(eq(organisationLocationTypes.organizationId, organizationId));

  const byPreset = new Map<string, string>();
  for (const row of rows) {
    if (row.presetKey) {
      byPreset.set(row.presetKey, row.id);
    }
  }
  return byPreset;
}

async function main(): Promise<void> {
  const connectionString = resolveDevDatabaseUrl();
  assertDevOnly(connectionString);

  const pool = new Pool(pgPoolOptions(connectionString));
  const db = drizzle(pool, { schema });

  const devOrgId = await resolveDevOrganizationId(db);
  const cleanResult = await cleanDevOrganisationEmployeesAndLocations(
    db,
    pool,
    devOrgId,
  );
  const rbacClean = await cleanDevRbacTestArtifacts(db, devOrgId);

  const typeIds = await ensureSystemLocationTypes(db, devOrgId);
  const officeTypeId = typeIds.get('office');
  const warehouseTypeId = typeIds.get('warehouse');
  const workshopTypeId = typeIds.get('workshop');
  if (!officeTypeId || !warehouseTypeId || !workshopTypeId) {
    throw new Error('Missing system location types for dev org.');
  }

  const locationSeeds = [
    {
      name: 'GrubFleet Corporate Headquarters',
      locationTypeId: officeTypeId,
      addressLine1: 'Embassy Tech Village, Outer Ring Road',
      addressLine2: 'Block C, 4th Floor',
      addressCity: 'Bengaluru',
      addressState: 'Karnataka',
      addressDistrict: 'Bengaluru Urban',
      addressPincode: '560103',
      siteContactPhone: '+918012345601',
      siteContactEmail: 'hq.reception@grubfleet.in',
    },
    {
      name: 'Mumbai Regional Office',
      locationTypeId: officeTypeId,
      addressLine1: 'One BKC, G Block',
      addressLine2: 'Bandra Kurla Complex',
      addressCity: 'Mumbai',
      addressState: 'Maharashtra',
      addressDistrict: 'Mumbai Suburban',
      addressPincode: '400051',
      siteContactPhone: '+912267890123',
      siteContactEmail: 'mumbai.office@grubfleet.in',
    },
    {
      name: 'Delhi NCR Sales Hub',
      locationTypeId: officeTypeId,
      addressLine1: 'DLF Cyber City, Phase 2',
      addressLine2: 'Tower 5, Level 8',
      addressCity: 'Gurugram',
      addressState: 'Haryana',
      addressDistrict: 'Gurugram',
      addressPincode: '122002',
      siteContactPhone: '+911244567890',
      siteContactEmail: 'ncr.sales@grubfleet.in',
    },
    {
      name: 'Pune Central Warehouse',
      locationTypeId: warehouseTypeId,
      addressLine1: 'Chakan Industrial Area, Phase 1',
      addressLine2: 'Plot 12, Logistics Park',
      addressCity: 'Pune',
      addressState: 'Maharashtra',
      addressDistrict: 'Pune',
      addressPincode: '410501',
      siteContactPhone: '+912066778899',
      siteContactEmail: 'warehouse.pune@grubfleet.in',
    },
    {
      name: 'Chennai Workshop & Service Centre',
      locationTypeId: workshopTypeId,
      addressLine1: 'Ambattur Industrial Estate',
      addressLine2: 'SIDCO Nagar, Unit 7',
      addressCity: 'Chennai',
      addressState: 'Tamil Nadu',
      addressDistrict: 'Chennai',
      addressPincode: '600058',
      siteContactPhone: '+914423344556',
      siteContactEmail: 'workshop.chennai@grubfleet.in',
    },
    {
      name: 'Hyderabad Fleet Operations',
      locationTypeId: officeTypeId,
      addressLine1: 'HITEC City, Madhapur',
      addressLine2: 'Mindspace Building 4',
      addressCity: 'Hyderabad',
      addressState: 'Telangana',
      addressDistrict: 'Hyderabad',
      addressPincode: '500081',
      siteContactPhone: '+914012345678',
      siteContactEmail: 'fleet.hyderabad@grubfleet.in',
    },
  ] as const;

  const insertedLocations = await db
    .insert(organisationLocations)
    .values(
      locationSeeds.map((loc) => ({
        organizationId: devOrgId,
        name: loc.name,
        locationTypeId: loc.locationTypeId,
        addressLine1: loc.addressLine1,
        addressLine2: loc.addressLine2,
        addressCity: loc.addressCity,
        addressState: loc.addressState,
        addressDistrict: loc.addressDistrict,
        addressPincode: loc.addressPincode,
        addressCountry: 'IN',
        siteContactPhone: loc.siteContactPhone,
        siteContactEmail: loc.siteContactEmail,
        isActive: true,
      })),
    )
    .returning({
      id: organisationLocations.id,
      name: organisationLocations.name,
    });

  const locationIdByName = new Map(
    insertedLocations.map((row) => [row.name, row.id]),
  );

  const hqId = locationIdByName.get('GrubFleet Corporate Headquarters')!;
  const mumbaiId = locationIdByName.get('Mumbai Regional Office')!;
  const puneId = locationIdByName.get('Pune Central Warehouse')!;
  const chennaiId = locationIdByName.get('Chennai Workshop & Service Centre')!;
  const hyderabadId = locationIdByName.get('Hyderabad Fleet Operations')!;
  const ncrId = locationIdByName.get('Delhi NCR Sales Hub')!;

  const [priya] = await db
    .insert(organisationEmployees)
    .values({
      organizationId: devOrgId,
      employeeCode: 'GF-EMP-1001',
      fullName: 'Priya Sharma',
      designation: 'Vice President, Operations',
      department: 'Operations',
      locationId: hqId,
      branchLocationLabel: 'GrubFleet Corporate Headquarters',
      employmentType: 'full_time',
      dateOfJoining: '2019-04-01',
      companyEmail: 'priya.sharma@grubfleet.in',
      mobile: '+919876543210',
      isActive: true,
    })
    .returning({
      id: organisationEmployees.id,
      fullName: organisationEmployees.fullName,
    });

  const [rahul] = await db
    .insert(organisationEmployees)
    .values({
      organizationId: devOrgId,
      employeeCode: 'GF-EMP-1002',
      fullName: 'Rahul Mehta',
      designation: 'Regional Manager — West',
      department: 'Operations',
      locationId: mumbaiId,
      branchLocationLabel: 'Mumbai Regional Office',
      employmentType: 'full_time',
      dateOfJoining: '2021-07-15',
      companyEmail: 'rahul.mehta@grubfleet.in',
      mobile: '+919811223344',
      reportsToEmployeeId: priya.id,
      isActive: true,
    })
    .returning({
      id: organisationEmployees.id,
      fullName: organisationEmployees.fullName,
    });

  const [ananya] = await db
    .insert(organisationEmployees)
    .values({
      organizationId: devOrgId,
      employeeCode: 'GF-EMP-1003',
      fullName: 'Ananya Iyer',
      designation: 'Warehouse Supervisor',
      department: 'Logistics',
      locationId: puneId,
      branchLocationLabel: 'Pune Central Warehouse',
      employmentType: 'full_time',
      dateOfJoining: '2022-01-10',
      companyEmail: 'ananya.iyer@grubfleet.in',
      mobile: '+919845667788',
      reportsToEmployeeId: priya.id,
      isActive: true,
    })
    .returning({
      id: organisationEmployees.id,
      fullName: organisationEmployees.fullName,
    });

  const [vikram] = await db
    .insert(organisationEmployees)
    .values({
      organizationId: devOrgId,
      employeeCode: 'GF-EMP-1004',
      fullName: 'Vikram Singh',
      designation: 'Workshop Manager',
      department: 'Workshop',
      locationId: chennaiId,
      branchLocationLabel: 'Chennai Workshop & Service Centre',
      employmentType: 'full_time',
      dateOfJoining: '2020-11-03',
      companyEmail: 'vikram.singh@grubfleet.in',
      mobile: '+919944556677',
      reportsToEmployeeId: priya.id,
      isActive: true,
    })
    .returning({
      id: organisationEmployees.id,
      fullName: organisationEmployees.fullName,
    });

  const [kavita] = await db
    .insert(organisationEmployees)
    .values({
      organizationId: devOrgId,
      employeeCode: 'GF-EMP-1005',
      fullName: 'Kavita Desai',
      designation: 'HR & Administration Manager',
      department: 'Human Resources',
      locationId: hqId,
      branchLocationLabel: 'GrubFleet Corporate Headquarters',
      employmentType: 'full_time',
      dateOfJoining: '2018-09-20',
      companyEmail: 'kavita.desai@grubfleet.in',
      mobile: '+919900112233',
      reportsToEmployeeId: priya.id,
      isActive: true,
    })
    .returning({
      id: organisationEmployees.id,
      fullName: organisationEmployees.fullName,
    });

  const [arjun] = await db
    .insert(organisationEmployees)
    .values({
      organizationId: devOrgId,
      employeeCode: 'GF-EMP-1006',
      fullName: 'Arjun Nair',
      designation: 'Fleet Coordinator',
      department: 'Fleet',
      locationId: hyderabadId,
      branchLocationLabel: 'Hyderabad Fleet Operations',
      employmentType: 'contract',
      dateOfJoining: '2023-06-01',
      companyEmail: 'arjun.nair@grubfleet.in',
      mobile: '+919877665544',
      reportsToEmployeeId: rahul.id,
      isActive: true,
    })
    .returning({
      id: organisationEmployees.id,
      fullName: organisationEmployees.fullName,
    });

  await db
    .update(organisationLocations)
    .set({
      responsibleEmployeeId: priya.id,
      deputyEmployeeId: kavita.id,
    })
    .where(eq(organisationLocations.id, hqId));

  await db
    .update(organisationLocations)
    .set({
      responsibleEmployeeId: rahul.id,
      deputyEmployeeId: arjun.id,
    })
    .where(eq(organisationLocations.id, mumbaiId));

  await db
    .update(organisationLocations)
    .set({
      responsibleEmployeeId: ananya.id,
    })
    .where(eq(organisationLocations.id, puneId));

  await db
    .update(organisationLocations)
    .set({
      responsibleEmployeeId: vikram.id,
    })
    .where(eq(organisationLocations.id, chennaiId));

  await db
    .update(organisationLocations)
    .set({
      responsibleEmployeeId: arjun.id,
    })
    .where(eq(organisationLocations.id, hyderabadId));

  await db
    .update(organisationLocations)
    .set({
      responsibleEmployeeId: rahul.id,
    })
    .where(eq(organisationLocations.id, ncrId));

  console.log(
    JSON.stringify(
      {
        connection: maskDatabaseUrl(connectionString),
        clean: cleanResult,
        rbacClean,
        seededLocations: insertedLocations.map((row) => row.name),
        seededEmployees: [
          priya.fullName,
          rahul.fullName,
          ananya.fullName,
          vikram.fullName,
          kavita.fullName,
          arjun.fullName,
        ],
      },
      null,
      2,
    ),
  );

  await pool.end();
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
