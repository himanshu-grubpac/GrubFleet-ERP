import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { AppModule } from '../../app.module';
import { GlobalHttpExceptionFilter } from '../../common/filters/http-exception.filter';
import {
  DEV_ADMIN_EMAIL,
  DEV_ADMIN_PASSWORD,
  DEV_ORG_SLUG,
  seedDevAdminBootstrap,
} from '../../database/seed/dev-admin-bootstrap';
import { ensureTestSchema } from '../../../test/helpers/ensure-test-schema';
import * as schema from '../../database/schema';
import {
  memberships,
  organizations,
  permissions,
  rolePermissions,
  roles,
  userRoles,
  users,
} from '../../database/schema';
import { and, eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';

describe('RBAC admin (integration)', () => {
  if (process.env.SKIP_DB_INTEGRATION === '1') {
    it.todo('skipped when SKIP_DB_INTEGRATION=1');
    return;
  }

  let app: INestApplication<App>;
  let pool: Pool;
  let organizationId: string;
  let adminAccessToken: string;
  let viewerAccessToken: string;
  let fleetViewOnlyToken: string;

  beforeAll(async () => {
    const connectionString =
      process.env.DATABASE_URL ??
      'postgresql://grubpac:grubpac_dev@localhost:5432/grubpac_erp';
    pool = new Pool({ connectionString });

    try {
      await pool.query('SELECT 1');
    } catch {
      pool.end().catch(() => undefined);
      throw new Error('PostgreSQL not available for RBAC integration tests');
    }

    await ensureTestSchema();
    const db = drizzle(pool, { schema });
    await seedDevAdminBootstrap(db);

    const orgRows = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, DEV_ORG_SLUG))
      .limit(1);
    organizationId = orgRows[0]?.id ?? '';
    if (!organizationId) {
      throw new Error('Dev organization missing after seed');
    }

    const viewerEmail = 'viewer.rbac@grubpac.local';
    const viewerPassword = 'ViewerTest123!';
    const passwordHash = await bcrypt.hash(viewerPassword, 12);
    await db
      .insert(users)
      .values({
        email: viewerEmail,
        passwordHash,
        fullName: 'RBAC Viewer',
        isActive: true,
      })
      .onConflictDoNothing({ target: users.email });

    const viewerUserRows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, viewerEmail))
      .limit(1);
    const viewerUserId = viewerUserRows[0]?.id;
    if (!viewerUserId) {
      throw new Error('Viewer user missing');
    }

    await db
      .insert(memberships)
      .values({
        userId: viewerUserId,
        organizationId,
        status: 'active',
        joinedAt: new Date(),
      })
      .onConflictDoNothing({
        target: [memberships.userId, memberships.organizationId],
      });

    const permRows = await db
      .select({ id: permissions.id, key: permissions.key })
      .from(permissions)
      .where(eq(permissions.key, 'administration.view'))
      .limit(1);
    const adminViewPermId = permRows[0]?.id;
    if (!adminViewPermId) {
      throw new Error('administration.view permission missing');
    }

    const viewerRoleName = 'RBAC Viewer Only';
    let viewerRoleId: string | undefined;
    const existingRole = await db
      .select({ id: roles.id })
      .from(roles)
      .where(
        and(
          eq(roles.name, viewerRoleName),
          eq(roles.organizationId, organizationId),
        ),
      )
      .limit(1);
    viewerRoleId = existingRole[0]?.id;
    if (!viewerRoleId) {
      await db
        .insert(roles)
        .values({
          organizationId,
          name: viewerRoleName,
          scope: 'organization',
          description: 'Integration test view-only',
          isSystem: false,
        })
        .onConflictDoNothing({
          target: [roles.organizationId, roles.name],
        });
      viewerRoleId = (
        await db
          .select({ id: roles.id })
          .from(roles)
          .where(
            and(
              eq(roles.name, viewerRoleName),
              eq(roles.organizationId, organizationId),
            ),
          )
          .limit(1)
      )[0]?.id;
    }
    if (!viewerRoleId) {
      throw new Error('Viewer role missing');
    }

    await db
      .insert(rolePermissions)
      .values({ roleId: viewerRoleId, permissionId: adminViewPermId })
      .onConflictDoNothing({
        target: [rolePermissions.roleId, rolePermissions.permissionId],
      });

    await db
      .insert(userRoles)
      .values({
        userId: viewerUserId,
        roleId: viewerRoleId,
        organizationId,
      })
      .onConflictDoNothing({
        target: [userRoles.userId, userRoles.roleId, userRoles.organizationId],
      });

    const fleetEmail = 'fleet.viewer@grubpac.local';
    const fleetPassword = 'FleetView123!';
    const fleetHash = await bcrypt.hash(fleetPassword, 12);
    await db
      .insert(users)
      .values({
        email: fleetEmail,
        passwordHash: fleetHash,
        fullName: 'Fleet View Only',
        isActive: true,
      })
      .onConflictDoNothing({ target: users.email });

    const fleetUserId = (
      await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, fleetEmail))
        .limit(1)
    )[0]?.id;
    if (!fleetUserId) {
      throw new Error('Fleet viewer user missing');
    }

    await db
      .insert(memberships)
      .values({
        userId: fleetUserId,
        organizationId,
        status: 'active',
        joinedAt: new Date(),
      })
      .onConflictDoNothing({
        target: [memberships.userId, memberships.organizationId],
      });

    const fleetViewPerm = (
      await db
        .select({ id: permissions.id })
        .from(permissions)
        .where(eq(permissions.key, 'fleet_leasing.view'))
        .limit(1)
    )[0]?.id;
    if (!fleetViewPerm) {
      throw new Error('fleet_leasing.view missing');
    }

    const fleetRoleName = 'Fleet View Only';
    let fleetRoleId = (
      await db
        .select({ id: roles.id })
        .from(roles)
        .where(
          and(
            eq(roles.name, fleetRoleName),
            eq(roles.organizationId, organizationId),
          ),
        )
        .limit(1)
    )[0]?.id;

    if (!fleetRoleId) {
      await db
        .insert(roles)
        .values({
          organizationId,
          name: fleetRoleName,
          scope: 'organization',
          isSystem: false,
        })
        .onConflictDoNothing({
          target: [roles.organizationId, roles.name],
        });
      fleetRoleId = (
        await db
          .select({ id: roles.id })
          .from(roles)
          .where(
            and(
              eq(roles.name, fleetRoleName),
              eq(roles.organizationId, organizationId),
            ),
          )
          .limit(1)
      )[0]?.id;
    }
    if (!fleetRoleId) {
      throw new Error('Fleet role missing');
    }

    await db
      .insert(rolePermissions)
      .values({ roleId: fleetRoleId, permissionId: fleetViewPerm })
      .onConflictDoNothing({
        target: [rolePermissions.roleId, rolePermissions.permissionId],
      });

    await db
      .insert(userRoles)
      .values({
        userId: fleetUserId,
        roleId: fleetRoleId,
        organizationId,
      })
      .onConflictDoNothing({
        target: [userRoles.userId, userRoles.roleId, userRoles.organizationId],
      });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
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

    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: DEV_ADMIN_EMAIL, password: DEV_ADMIN_PASSWORD })
      .expect(201);
    adminAccessToken = (adminLogin.body as { accessToken: string }).accessToken;

    const viewerLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: viewerEmail, password: viewerPassword })
      .expect(201);
    viewerAccessToken = (viewerLogin.body as { accessToken: string })
      .accessToken;

    const fleetLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: fleetEmail, password: fleetPassword })
      .expect(201);
    fleetViewOnlyToken = (fleetLogin.body as { accessToken: string })
      .accessToken;
  }, 90000);

  afterAll(async () => {
    await app?.close();
    await pool?.end();
  });

  it('GET /users returns 403 without administration.manage for create', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .query({ organizationId })
      .set('Authorization', `Bearer ${viewerAccessToken}`)
      .send({
        organizationId,
        email: 'blocked@grubpac.local',
        fullName: 'Blocked',
      })
      .expect(403);
  });

  it('GET /users lists members with administration.view', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/users')
      .query({ organizationId, page: 1, pageSize: 10 })
      .set('Authorization', `Bearer ${viewerAccessToken}`)
      .expect(200);

    const body = res.body as { items: unknown[]; total: number };
    expect(body.total).toBeGreaterThan(0);
    expect(Array.isArray(body.items)).toBe(true);
  });

  it('denies org isolation for unknown organization', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/users')
      .query({
        organizationId: '00000000-0000-4000-8000-000000000099',
        page: 1,
      })
      .set('Authorization', `Bearer ${viewerAccessToken}`)
      .expect(403);
  });

  it('role CRUD with moduleAccess contract', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/roles')
      .query({ organizationId })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        organizationId,
        name: `Integration Role ${Date.now()}`,
        description: 'test',
        moduleAccess: [{ moduleId: 'administration', accessLevel: 'VIEW' }],
      })
      .expect(201);

    const created = createRes.body as {
      id: string;
      permissionKeys: string[];
      moduleAccess: Array<{ moduleId: string; accessLevel: string }>;
    };
    expect(created.permissionKeys).toContain('administration.view');
    expect(created.moduleAccess).toContainEqual({
      moduleId: 'administration',
      accessLevel: 'VIEW',
    });

    await request(app.getHttpServer())
      .get('/api/v1/roles')
      .query({ organizationId, page: 1 })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/v1/roles/${created.id}`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ description: 'updated' })
      .expect(200);
  });

  it('creates fleet_leasing VIEW role and denies admin manage actions', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/roles')
      .query({ organizationId })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        organizationId,
        name: `Fleet View Role ${Date.now()}`,
        moduleAccess: [{ moduleId: 'fleet_leasing', accessLevel: 'VIEW' }],
      })
      .expect(201);

    const created = createRes.body as { permissionKeys: string[] };
    expect(created.permissionKeys).toEqual(['fleet_leasing.view']);
    expect(created.permissionKeys).not.toContain('fleet_leasing.manage');

    await request(app.getHttpServer())
      .post('/api/v1/users')
      .query({ organizationId })
      .set('Authorization', `Bearer ${fleetViewOnlyToken}`)
      .send({
        organizationId,
        email: 'no-admin@grubpac.local',
        fullName: 'No Admin',
      })
      .expect(403);
  });

  it('delegation failure when granting module FULL above actor', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/roles')
      .query({ organizationId })
      .set('Authorization', `Bearer ${viewerAccessToken}`)
      .send({
        organizationId,
        name: `Should Fail ${Date.now()}`,
        moduleAccess: [{ moduleId: 'administration', accessLevel: 'FULL' }],
      })
      .expect(403);
  });

  it('GET /roles/editor-matrix returns module rows', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/roles/editor-matrix')
      .query({ organizationId })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    const body = res.body as {
      modules: Array<{ moduleId: string; allowedLevels: string[] }>;
    };
    expect(body.modules.length).toBeGreaterThan(5);
    const fleetRow = body.modules.find((m) => m.moduleId === 'fleet_leasing');
    expect(fleetRow?.allowedLevels).toContain('FULL');
  });

  it('GET /modules lists sidebar modules', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/modules')
      .query({ organizationId })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    const body = res.body as { items: Array<{ id: string }> };
    expect(body.items.some((m) => m.id === 'fleet_leasing')).toBe(true);
  });

  it('GET /audit requires administration.view', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/audit')
      .query({ organizationId, page: 1 })
      .set('Authorization', `Bearer ${fleetViewOnlyToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get('/api/v1/audit')
      .query({ organizationId, page: 1 })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);
  });

  it('GET /auth/me includes moduleAccess', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    const body = res.body as {
      moduleAccess: Array<{ moduleId: string }>;
      memberships: Array<{ moduleAccess: unknown[] }>;
    };
    expect(body.moduleAccess.length).toBeGreaterThan(0);
    expect(body.memberships[0]?.moduleAccess.length).toBeGreaterThan(0);
  });
});
