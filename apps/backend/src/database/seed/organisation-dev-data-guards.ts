import * as dotenv from 'dotenv';
import * as path from 'path';
import { and, eq, inArray, isNull, ne, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import * as schema from '../schema';
import {
  organisationLocationTypes,
  organisationLocations,
  organizations,
  roles,
  users,
} from '../schema';
import {
  DEV_ADMIN_EMAIL,
  DEV_ADMIN_ROLE_NAME,
  DEV_ORG_SLUG,
  DEV_SYSTEM_ADMIN_ROLE_NAME,
} from './dev-admin-bootstrap';

dotenv.config({ path: path.resolve(__dirname, '../../../.env.development') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const LOCAL_DEFAULT_DATABASE_URL =
  'postgresql://grubpac:grubpac_dev@localhost:5432/grubpac_erp';

export function resolveDevDatabaseUrl(): string {
  return process.env.DATABASE_URL ?? LOCAL_DEFAULT_DATABASE_URL;
}

export function assertDevOnly(connectionString: string): void {
  const confirmDev = process.argv.includes('--confirm-dev');
  const appEnv = process.env.APP_ENV;

  if (
    appEnv === 'production' ||
    appEnv === 'staging' ||
    appEnv === 'pre-production'
  ) {
    throw new Error(`Refusing when APP_ENV=${appEnv}. Local development only.`);
  }

  if (/rds\.amazonaws\.com/i.test(connectionString)) {
    throw new Error(
      'Refusing against RDS. Use local Docker DATABASE_URL only.',
    );
  }

  if (
    appEnv != null &&
    appEnv !== '' &&
    appEnv !== 'development' &&
    !confirmDev
  ) {
    throw new Error(
      `Refusing when APP_ENV=${appEnv}. Set APP_ENV=development or pass --confirm-dev.`,
    );
  }

  if (!confirmDev && appEnv !== 'development') {
    throw new Error(
      'Pass --confirm-dev (local DATABASE_URL only) or set APP_ENV=development.',
    );
  }
}

type AppDb = NodePgDatabase<typeof schema>;

export async function resolveDevOrganizationId(db: AppDb): Promise<string> {
  const orgRows = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, DEV_ORG_SLUG))
    .limit(1);
  const devOrgId = orgRows[0]?.id;
  if (!devOrgId) {
    throw new Error(
      `Dev organization slug "${DEV_ORG_SLUG}" not found. Run npm run db:seed -w backend first.`,
    );
  }
  return devOrgId;
}

export type CleanOrganisationDataResult = {
  organizationSlug: string;
  organizationId: string;
  deletedEmployees: number;
  deletedLocations: number;
  deletedLocationNames: string[];
  remainingLocationsInDevOrg: number;
  deletedNonSystemLocationTypes: number;
  deletedNonSystemLocationTypeNames: string[];
  remainingLocationTypesInDevOrg: number;
};

export async function cleanDevOrganisationEmployeesAndLocations(
  db: AppDb,
  pool: Pool,
  devOrgId: string,
): Promise<CleanOrganisationDataResult> {
  await pool.query(
    `UPDATE organisation_locations
     SET responsible_employee_id = NULL, deputy_employee_id = NULL
     WHERE organization_id = $1`,
    [devOrgId],
  );

  const employeeDeleteResult = await pool.query<{ id: string }>(
    `DELETE FROM organisation_employees
     WHERE organization_id = $1
     RETURNING id`,
    [devOrgId],
  );

  const deleted = await db
    .delete(organisationLocations)
    .where(eq(organisationLocations.organizationId, devOrgId))
    .returning({
      id: organisationLocations.id,
      name: organisationLocations.name,
    });

  const remaining = await db
    .select({ id: organisationLocations.id })
    .from(organisationLocations)
    .where(eq(organisationLocations.organizationId, devOrgId));

  const deletedCustomTypes = await db
    .delete(organisationLocationTypes)
    .where(
      and(
        eq(organisationLocationTypes.organizationId, devOrgId),
        eq(organisationLocationTypes.isSystem, false),
      ),
    )
    .returning({
      name: organisationLocationTypes.name,
    });

  const remainingTypes = await db
    .select({ id: organisationLocationTypes.id })
    .from(organisationLocationTypes)
    .where(eq(organisationLocationTypes.organizationId, devOrgId));

  return {
    organizationSlug: DEV_ORG_SLUG,
    organizationId: devOrgId,
    deletedEmployees:
      employeeDeleteResult.rowCount ?? employeeDeleteResult.rows.length,
    deletedLocations: deleted.length,
    deletedLocationNames: deleted.map((row) => row.name),
    remainingLocationsInDevOrg: remaining.length,
    deletedNonSystemLocationTypes: deletedCustomTypes.length,
    deletedNonSystemLocationTypeNames: deletedCustomTypes.map((row) => row.name),
    remainingLocationTypesInDevOrg: remainingTypes.length,
  };
}

export function maskDatabaseUrl(connectionString: string): string {
  return connectionString.replace(/:[^:@/]+@/, ':***@');
}

/** Integration / RBAC specs — never seeded in dev bootstrap; safe to purge locally. */
export const DEV_TEST_USER_EMAIL_SUFFIX = '@grubpac.local';

export type CleanDevRbacTestArtifactsResult = {
  deletedTestUsers: number;
  deletedTestUserEmails: string[];
  deletedOrgRoles: number;
  deletedOrgRoleNames: string[];
  deletedSystemRoles: number;
  deletedSystemRoleNames: string[];
  remainingOrgRoles: string[];
};

/**
 * Removes integration-test users (@grubpac.local except dev admin) and non-catalog
 * org roles for the dev org (keeps Organization Admin). Also drops junk system roles
 * except the seeded System Administrator.
 */
export async function cleanDevRbacTestArtifacts(
  db: AppDb,
  devOrgId: string,
): Promise<CleanDevRbacTestArtifactsResult> {
  const deletedUsers = await db
    .delete(users)
    .where(
      and(
        ne(users.email, DEV_ADMIN_EMAIL),
        sql`lower(${users.email}) LIKE ${`%${DEV_TEST_USER_EMAIL_SUFFIX}`}`,
      ),
    )
    .returning({ email: users.email });

  const orgRoleRows = await db
    .select({ id: roles.id, name: roles.name })
    .from(roles)
    .where(eq(roles.organizationId, devOrgId));

  const orgRoleIdsToDelete = orgRoleRows
    .filter((role) => role.name !== DEV_ADMIN_ROLE_NAME)
    .map((role) => role.id);

  const deletedOrgRoles =
    orgRoleIdsToDelete.length > 0
      ? await db
          .delete(roles)
          .where(inArray(roles.id, orgRoleIdsToDelete))
          .returning({ name: roles.name })
      : [];

  const junkSystemRoles = await db
    .select({ id: roles.id, name: roles.name })
    .from(roles)
    .where(
      and(
        eq(roles.scope, 'system'),
        isNull(roles.organizationId),
        ne(roles.name, DEV_SYSTEM_ADMIN_ROLE_NAME),
      ),
    );

  const deletedSystemRoles =
    junkSystemRoles.length > 0
      ? await db
          .delete(roles)
          .where(
            inArray(
              roles.id,
              junkSystemRoles.map((r) => r.id),
            ),
          )
          .returning({ name: roles.name })
      : [];

  const remainingOrgRoles = await db
    .select({ name: roles.name })
    .from(roles)
    .where(eq(roles.organizationId, devOrgId));

  return {
    deletedTestUsers: deletedUsers.length,
    deletedTestUserEmails: deletedUsers.map((u) => u.email),
    deletedOrgRoles: deletedOrgRoles.length,
    deletedOrgRoleNames: deletedOrgRoles.map((r) => r.name),
    deletedSystemRoles: deletedSystemRoles.length,
    deletedSystemRoleNames: deletedSystemRoles.map((r) => r.name),
    remainingOrgRoles: remainingOrgRoles.map((r) => r.name),
  };
}
