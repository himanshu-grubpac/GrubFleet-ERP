import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { drizzle } from 'drizzle-orm/node-postgres';
import { and, eq, inArray, ne, notInArray } from 'drizzle-orm';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../../src/app.module';
import { GlobalHttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import type { AppDatabase } from '../../src/database/database.module';
import {
  DEV_ADMIN_EMAIL,
  DEV_ADMIN_PASSWORD,
  DEV_ORG_SLUG,
  seedDevAdminBootstrap,
} from '../../src/database/seed/dev-admin-bootstrap';
import * as schema from '../../src/database/schema';
import {
  memberships,
  organizations,
  permissions,
  rolePermissions,
  roles,
  userRoles,
  users,
} from '../../src/database/schema';
import { ensureTestSchema } from './ensure-test-schema';

export const ORG_VIEW_ONLY_USER = {
  email: 'org.viewonly@grubpac.local',
  password: 'OrgViewOnly123!',
  fullName: 'Organisation View Only',
  roleName: 'Organisation View Only',
  permissionKeys: ['organisation.view'],
} as const;

export type PermissionUserSpec = {
  email: string;
  password: string;
  fullName: string;
  roleName: string;
  roleDescription?: string;
  permissionKeys: readonly string[];
};

export type IntegrationAuthContext = {
  app: INestApplication<App>;
  pool: Pool;
  db: AppDatabase;
  organizationId: string;
  adminAccessToken: string;
  /** Holds `organisation.view` only — use for 403 on organisation writes. */
  orgViewOnlyAccessToken: string;
  close: () => Promise<void>;
};

/** Mirrors the global pipe + filter from `src/bootstrap-app.ts`. */
export async function createIntegrationApp(): Promise<INestApplication<App>> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleFixture.createNestApplication<INestApplication<App>>();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new GlobalHttpExceptionFilter());
  await app.init();
  return app;
}

export async function loginAs(
  app: INestApplication<App>,
  email: string,
  password: string,
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password })
    .expect(201);
  return (res.body as { accessToken: string }).accessToken;
}

/**
 * Idempotently provisions a user whose only role in the org grants exactly
 * `permissionKeys`. Stale grants from earlier runs are removed so the user
 * stays least-privileged.
 */
export async function ensureUserWithPermissions(
  db: AppDatabase,
  organizationId: string,
  spec: PermissionUserSpec,
): Promise<{ userId: string; roleId: string }> {
  const passwordHash = await bcrypt.hash(spec.password, 12);
  await db
    .insert(users)
    .values({
      email: spec.email,
      passwordHash,
      fullName: spec.fullName,
      isActive: true,
    })
    .onConflictDoNothing({ target: users.email });
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, spec.email))
    .limit(1);
  if (!user) throw new Error(`Test user ${spec.email} missing`);

  await db
    .insert(memberships)
    .values({
      userId: user.id,
      organizationId,
      status: 'active',
      joinedAt: new Date(),
    })
    .onConflictDoNothing({
      target: [memberships.userId, memberships.organizationId],
    });

  const roleDescription = spec.roleDescription ?? 'Integration test role';
  const upsertedRole = await db
    .insert(roles)
    .values({
      organizationId,
      name: spec.roleName,
      scope: 'organization',
      description: roleDescription,
      isSystem: false,
      isActive: true,
    })
    .onConflictDoUpdate({
      target: [roles.organizationId, roles.name],
      set: {
        isActive: true,
        description: roleDescription,
      },
    })
    .returning({ id: roles.id });
  let roleId = upsertedRole[0]?.id;
  if (!roleId) {
    const [resolvedRole] = await db
      .select({ id: roles.id })
      .from(roles)
      .where(
        and(
          eq(roles.organizationId, organizationId),
          eq(roles.name, spec.roleName),
        ),
      )
      .limit(1);
    roleId = resolvedRole?.id;
  }
  if (!roleId) throw new Error(`Test role ${spec.roleName} missing`);
  const role = { id: roleId };

  const permRows = await db
    .select({ id: permissions.id, key: permissions.key })
    .from(permissions)
    .where(inArray(permissions.key, [...spec.permissionKeys]));
  if (permRows.length !== spec.permissionKeys.length) {
    const found = new Set(permRows.map((row) => row.key));
    const missing = spec.permissionKeys.filter((key) => !found.has(key));
    throw new Error(`Permission keys missing from catalog: ${missing.join()}`);
  }
  const permissionIds = permRows.map((row) => row.id);
  await db
    .delete(rolePermissions)
    .where(
      and(
        eq(rolePermissions.roleId, role.id),
        notInArray(rolePermissions.permissionId, permissionIds),
      ),
    );
  await db
    .insert(rolePermissions)
    .values(
      permissionIds.map((permissionId) => ({ roleId: role.id, permissionId })),
    )
    .onConflictDoNothing({
      target: [rolePermissions.roleId, rolePermissions.permissionId],
    });

  await db
    .delete(userRoles)
    .where(
      and(
        eq(userRoles.userId, user.id),
        eq(userRoles.organizationId, organizationId),
        ne(userRoles.roleId, role.id),
      ),
    );
  await db
    .insert(userRoles)
    .values({ userId: user.id, roleId: role.id, organizationId })
    .onConflictDoNothing({
      target: [userRoles.userId, userRoles.roleId, userRoles.organizationId],
    });

  return { userId: user.id, roleId: role.id };
}

export async function bootstrapIntegrationAuth(): Promise<IntegrationAuthContext> {
  const connectionString =
    process.env.DATABASE_URL ??
    'postgresql://grubpac:grubpac_dev@localhost:5432/grubpac_erp';
  const pool = new Pool({ connectionString });
  try {
    await pool.query('SELECT 1');
  } catch {
    await pool.end().catch(() => undefined);
    throw new Error(
      'PostgreSQL not available for integration tests (start the dev stack or set SKIP_DB_INTEGRATION=1)',
    );
  }

  await ensureTestSchema();
  const db = drizzle(pool, { schema });
  await seedDevAdminBootstrap(db);

  const [org] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, DEV_ORG_SLUG))
    .limit(1);
  if (!org) throw new Error('Dev organization missing after seed');

  await ensureUserWithPermissions(db, org.id, ORG_VIEW_ONLY_USER);

  const app = await createIntegrationApp();
  const adminAccessToken = await loginAs(
    app,
    DEV_ADMIN_EMAIL,
    DEV_ADMIN_PASSWORD,
  );
  const orgViewOnlyAccessToken = await loginAs(
    app,
    ORG_VIEW_ONLY_USER.email,
    ORG_VIEW_ONLY_USER.password,
  );

  return {
    app,
    pool,
    db,
    organizationId: org.id,
    adminAccessToken,
    orgViewOnlyAccessToken,
    close: async () => {
      await app.close();
      await pool.end();
    },
  };
}
