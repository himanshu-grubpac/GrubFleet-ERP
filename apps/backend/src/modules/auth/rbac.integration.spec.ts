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
  DEV_ADMIN_ROLE_NAME,
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
import { and, eq, inArray } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import {
  ensureUserWithPermissions,
  loginAs,
  ORG_VIEW_ONLY_USER,
} from '../../../test/helpers/integration-auth';
import {
  deleteIntegrationTestUsersByEmails,
  deleteOrgRoleByNameIfExists,
  purgeRbacIntegrationTestRoles,
  RBAC_INTEGRATION_EPHEMERAL_USER_EMAILS,
  RBAC_INTEGRATION_MANAGE_TIER_CREATED_USER_EMAIL,
  RBAC_INTEGRATION_MANAGE_TIER_OPERATOR_EMAIL,
} from '../../../test/helpers/integration-rbac-cleanup';
import { rbacIntegrationTestRoleName } from '../../database/seed/dev-role-data-policy';

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
  let viewerRoleId: string;
  let orgAdminRoleId: string;
  let fleetViewOnlyToken: string;
  let orgViewOnlyAccessToken: string;

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
    let resolvedViewerRoleId: string | undefined;
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
    resolvedViewerRoleId = existingRole[0]?.id;
    if (!resolvedViewerRoleId) {
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
      resolvedViewerRoleId = (
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
    if (!resolvedViewerRoleId) {
      throw new Error('Viewer role missing');
    }
    viewerRoleId = resolvedViewerRoleId;

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

    await ensureUserWithPermissions(db, organizationId, ORG_VIEW_ONLY_USER);
    orgViewOnlyAccessToken = await loginAs(
      app,
      ORG_VIEW_ONLY_USER.email,
      ORG_VIEW_ONLY_USER.password,
    );

    const orgAdminRoleRow = (
      await db
        .select({ id: roles.id })
        .from(roles)
        .where(
          and(
            eq(roles.name, DEV_ADMIN_ROLE_NAME),
            eq(roles.organizationId, organizationId),
          ),
        )
        .limit(1)
    )[0];
    if (!orgAdminRoleRow?.id) {
      throw new Error('Organization Admin role missing after seed');
    }
    orgAdminRoleId = orgAdminRoleRow.id;
  }, 90000);

  afterAll(async () => {
    if (pool && organizationId) {
      const db = drizzle(pool, { schema });
      await deleteIntegrationTestUsersByEmails(
        db,
        RBAC_INTEGRATION_EPHEMERAL_USER_EMAILS,
      );
      await purgeRbacIntegrationTestRoles(db, organizationId);
    }
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

  it('GET /roles/:id returns org-scoped role and 404 for missing id', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/roles')
      .query({ organizationId })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        organizationId,
        name: rbacIntegrationTestRoleName('get-by-id'),
        moduleAccess: [{ moduleId: 'dashboard', accessLevel: 'VIEW' }],
      })
      .expect(201);

    const created = createRes.body as { id: string; name: string };

    const getRes = await request(app.getHttpServer())
      .get(`/api/v1/roles/${created.id}`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    const fetched = getRes.body as { id: string; name: string };
    expect(fetched.id).toBe(created.id);
    expect(fetched.name).toBe(created.name);

    await request(app.getHttpServer())
      .get(`/api/v1/roles/${created.id}`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${viewerAccessToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .get(`/api/v1/roles/${created.id}`)
      .query({
        organizationId: '00000000-0000-4000-8000-000000000099',
      })
      .set('Authorization', `Bearer ${viewerAccessToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get(`/api/v1/roles/00000000-0000-4000-8000-000000000001`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/api/v1/roles/${created.id}`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);
  });

  it('DELETE custom role, PATCH isActive, DELETE system role returns 409', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/roles')
      .query({ organizationId })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        organizationId,
        name: rbacIntegrationTestRoleName('lifecycle'),
        moduleAccess: [{ moduleId: 'dashboard', accessLevel: 'VIEW' }],
      })
      .expect(201);

    const roleId = (createRes.body as { id: string }).id;

    const deactivated = await request(app.getHttpServer())
      .patch(`/api/v1/roles/${roleId}`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ isActive: false })
      .expect(200);
    expect((deactivated.body as { isActive: boolean }).isActive).toBe(false);

    const reactivated = await request(app.getHttpServer())
      .patch(`/api/v1/roles/${roleId}`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ isActive: true })
      .expect(200);
    expect((reactivated.body as { isActive: boolean }).isActive).toBe(true);

    await request(app.getHttpServer())
      .delete(`/api/v1/roles/${roleId}`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/api/v1/roles/${orgAdminRoleId}`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(409);
  });

  it('role CRUD with moduleAccess contract', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/roles')
      .query({ organizationId })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        organizationId,
        name: rbacIntegrationTestRoleName('module-access-crud'),
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

    await request(app.getHttpServer())
      .delete(`/api/v1/roles/${created.id}`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);
  });

  it('creates fleet_leasing VIEW role and denies admin manage actions', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/roles')
      .query({ organizationId })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        organizationId,
        name: rbacIntegrationTestRoleName('fleet-view'),
        moduleAccess: [{ moduleId: 'fleet_leasing', accessLevel: 'VIEW' }],
      })
      .expect(201);

    const created = createRes.body as { permissionKeys: string[] };
    expect(created.permissionKeys).toEqual(['fleet_leasing.view']);
    expect(created.permissionKeys).not.toContain('fleet_leasing.manage');

    const manageRes = await request(app.getHttpServer())
      .post('/api/v1/roles')
      .query({ organizationId })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        organizationId,
        name: rbacIntegrationTestRoleName('fleet-manage'),
        moduleAccess: [{ moduleId: 'fleet_leasing', accessLevel: 'MANAGE' }],
      })
      .expect(201);

    const manageBody = manageRes.body as { permissionKeys: string[] };
    expect(manageBody.permissionKeys).toEqual(
      expect.arrayContaining([
        'fleet_leasing.view',
        'fleet_leasing.create',
        'fleet_leasing.update',
        'fleet_leasing.delete',
      ]),
    );
    expect(manageBody.permissionKeys).not.toContain('fleet_leasing.manage');

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

    const manageRoleId = (manageRes.body as { id: string }).id;
    const viewRoleId = (createRes.body as { id: string }).id;
    await request(app.getHttpServer())
      .delete(`/api/v1/roles/${manageRoleId}`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .delete(`/api/v1/roles/${viewRoleId}`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);
  });

  it('delegation failure when granting module FULL above actor', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/roles')
      .query({ organizationId })
      .set('Authorization', `Bearer ${viewerAccessToken}`)
      .send({
        organizationId,
        name: rbacIntegrationTestRoleName('delegation-should-fail'),
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
    expect(fleetRow?.allowedLevels).toContain('MANAGE');
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

  it('administration MANAGE tier allows user create without administration.manage', async () => {
    const db = drizzle(pool, { schema });
    const roleName = rbacIntegrationTestRoleName('admin-manage-only');
    await deleteIntegrationTestUsersByEmails(db, [
      RBAC_INTEGRATION_MANAGE_TIER_OPERATOR_EMAIL,
      RBAC_INTEGRATION_MANAGE_TIER_CREATED_USER_EMAIL,
    ]);
    await deleteOrgRoleByNameIfExists(db, organizationId, roleName);

    try {
      const createRoleRes = await request(app.getHttpServer())
        .post('/api/v1/roles')
        .query({ organizationId })
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          organizationId,
          name: roleName,
          moduleAccess: [
            { moduleId: 'dashboard', accessLevel: 'VIEW' },
            { moduleId: 'administration', accessLevel: 'MANAGE' },
          ],
        })
        .expect(201);

      const manageRole = createRoleRes.body as {
        id: string;
        permissionKeys: string[];
      };
      expect(manageRole.permissionKeys).toContain('administration.create');
      expect(manageRole.permissionKeys).not.toContain('administration.manage');

      const operatorEmail = RBAC_INTEGRATION_MANAGE_TIER_OPERATOR_EMAIL;
      const operatorPassword = 'AdminManageOp123!';
      const createUserRes = await request(app.getHttpServer())
        .post('/api/v1/users')
        .query({ organizationId })
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          organizationId,
          email: operatorEmail,
          password: operatorPassword,
          fullName: 'Admin Manage Operator',
        })
        .expect(201);

      const operatorId = (createUserRes.body as { id: string }).id;

      await request(app.getHttpServer())
        .post(`/api/v1/roles/${manageRole.id}/assign`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ organizationId, userId: operatorId })
        .expect(201);

      const operatorLogin = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: operatorEmail, password: operatorPassword })
        .expect(201);
      const operatorToken = (operatorLogin.body as { accessToken: string })
        .accessToken;

      await request(app.getHttpServer())
        .post('/api/v1/users')
        .query({ organizationId })
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          organizationId,
          email: RBAC_INTEGRATION_MANAGE_TIER_CREATED_USER_EMAIL,
          fullName: 'Created By Manage Tier',
        })
        .expect(201);

      const meRes = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${operatorToken}`)
        .expect(200);
      const meBody = meRes.body as {
        moduleAccess: Array<{ moduleId: string; accessLevel: string }>;
      };
      const adminMod = meBody.moduleAccess.find(
        (m) => m.moduleId === 'administration',
      );
      expect(adminMod?.accessLevel).toBe('MANAGE');

      await request(app.getHttpServer())
        .delete(`/api/v1/roles/${manageRole.id}/assign`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ organizationId, userId: operatorId })
        .expect(200);

      await request(app.getHttpServer())
        .delete(`/api/v1/roles/${manageRole.id}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);
    } finally {
      await deleteIntegrationTestUsersByEmails(db, [
        RBAC_INTEGRATION_MANAGE_TIER_OPERATOR_EMAIL,
        RBAC_INTEGRATION_MANAGE_TIER_CREATED_USER_EMAIL,
      ]);
      await deleteOrgRoleByNameIfExists(db, organizationId, roleName);
    }
  });

  it('GET /auth/me includes moduleAccess', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    const body = res.body as {
      moduleAccess: Array<{ moduleId: string }>;
      memberships: Array<{
        moduleAccess: unknown[];
        permissionRevision: number;
      }>;
    };
    expect(body.moduleAccess.length).toBeGreaterThan(0);
    expect(body.memberships[0]?.moduleAccess.length).toBeGreaterThan(0);
    expect(typeof body.memberships[0]?.permissionRevision).toBe('number');
  });

  it('invalidates permission cache after role update and assign', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/audit')
      .query({ organizationId, page: 1 })
      .set('Authorization', `Bearer ${viewerAccessToken}`)
      .expect(200);

    const meBefore = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${viewerAccessToken}`)
      .expect(200);
    const membershipBefore = (
      meBefore.body as {
        memberships: Array<{
          organizationId: string;
          permissionKeys: string[];
          permissionRevision: number;
        }>;
      }
    ).memberships.find((m) => m.organizationId === organizationId);
    expect(membershipBefore?.permissionKeys).toContain('administration.view');
    const revisionBefore = membershipBefore?.permissionRevision ?? 0;

    await request(app.getHttpServer())
      .patch(`/api/v1/roles/${viewerRoleId}`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        moduleAccess: [{ moduleId: 'dashboard', accessLevel: 'VIEW' }],
      })
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/v1/audit')
      .query({ organizationId, page: 1 })
      .set('Authorization', `Bearer ${viewerAccessToken}`)
      .expect(403);

    const meAfter = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${viewerAccessToken}`)
      .expect(200);
    const membershipAfter = (
      meAfter.body as {
        memberships: Array<{
          organizationId: string;
          permissionKeys: string[];
          permissionRevision: number;
        }>;
      }
    ).memberships.find((m) => m.organizationId === organizationId);
    expect(membershipAfter?.permissionKeys).not.toContain(
      'administration.view',
    );
    expect(membershipAfter?.permissionRevision).toBeGreaterThan(revisionBefore);

    await request(app.getHttpServer())
      .patch(`/api/v1/roles/${viewerRoleId}`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        moduleAccess: [{ moduleId: 'administration', accessLevel: 'VIEW' }],
      })
      .expect(200);
  });

  it('organisation.view user cannot PATCH organisation employees (cross-module guard)', async () => {
    const listRes = await request(app.getHttpServer())
      .get('/api/v1/organisation/employees')
      .query({ organizationId, page: 1, pageSize: 1 })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
    const employeeId = (listRes.body as { items: Array<{ id: string }> })
      .items[0]?.id;
    expect(employeeId).toBeDefined();

    await request(app.getHttpServer())
      .patch(`/api/v1/organisation/employees/${employeeId}`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${orgViewOnlyAccessToken}`)
      .set('x-organization-id', organizationId)
      .send({ fullName: 'Blocked By View Only' })
      .expect(403);
  });

  it('unassign role invalidates effective permissions on /auth/me', async () => {
    const viewerUserId = (
      await drizzle(pool, { schema })
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, 'viewer.rbac@grubpac.local'))
        .limit(1)
    )[0]?.id;
    expect(viewerUserId).toBeDefined();

    const meBefore = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${viewerAccessToken}`)
      .expect(200);
    const membershipBefore = (
      meBefore.body as {
        memberships: Array<{
          organizationId: string;
          permissionKeys: string[];
        }>;
      }
    ).memberships.find((m) => m.organizationId === organizationId);
    expect(membershipBefore?.permissionKeys).toContain('administration.view');

    await request(app.getHttpServer())
      .delete(`/api/v1/roles/${viewerRoleId}/assign`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ organizationId, userId: viewerUserId })
      .expect(200);

    const meAfter = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${viewerAccessToken}`)
      .expect(200);
    const membershipAfter = (
      meAfter.body as {
        memberships: Array<{
          organizationId: string;
          permissionKeys: string[];
        }>;
      }
    ).memberships.find((m) => m.organizationId === organizationId);
    expect(membershipAfter?.permissionKeys ?? []).not.toContain(
      'administration.view',
    );

    await request(app.getHttpServer())
      .post(`/api/v1/roles/${viewerRoleId}/assign`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ organizationId, userId: viewerUserId })
      .expect(201);
  });

  it('role hierarchy: create with parentRoleId, cycle rejected, visibility filtered', async () => {
    const rootRes = await request(app.getHttpServer())
      .post('/api/v1/roles')
      .query({ organizationId })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        organizationId,
        name: rbacIntegrationTestRoleName('hierarchy.root'),
        moduleAccess: [{ moduleId: 'dashboard', accessLevel: 'VIEW' }],
      })
      .expect(201);
    const rootId = (rootRes.body as { id: string; parentRoleId: null }).id;
    expect(
      (rootRes.body as { parentRoleId: string | null }).parentRoleId,
    ).toBeNull();

    const midRes = await request(app.getHttpServer())
      .post('/api/v1/roles')
      .query({ organizationId })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        organizationId,
        name: rbacIntegrationTestRoleName('hierarchy.mid'),
        parentRoleId: rootId,
        moduleAccess: [{ moduleId: 'dashboard', accessLevel: 'VIEW' }],
      })
      .expect(201);
    const midId = (midRes.body as { id: string }).id;
    expect((midRes.body as { parentRoleId: string }).parentRoleId).toBe(rootId);

    const leafRes = await request(app.getHttpServer())
      .post('/api/v1/roles')
      .query({ organizationId })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        organizationId,
        name: rbacIntegrationTestRoleName('hierarchy.leaf'),
        parentRoleId: midId,
        moduleAccess: [{ moduleId: 'dashboard', accessLevel: 'VIEW' }],
      })
      .expect(201);
    const leafId = (leafRes.body as { id: string }).id;

    await request(app.getHttpServer())
      .patch(`/api/v1/roles/${midId}`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ parentRoleId: leafId })
      .expect(400);

    const hierarchyOpEmail = 'hierarchy.op@grubpac.local';
    const hierarchyOpPassword = 'HierarchyOp123!';
    const hierarchyOpHash = await bcrypt.hash(hierarchyOpPassword, 12);
    const db = drizzle(pool, { schema });
    await db
      .insert(users)
      .values({
        email: hierarchyOpEmail,
        passwordHash: hierarchyOpHash,
        fullName: 'Hierarchy Operator',
        isActive: true,
      })
      .onConflictDoNothing({ target: users.email });

    const hierarchyOpUserId = (
      await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, hierarchyOpEmail))
        .limit(1)
    )[0]?.id;
    expect(hierarchyOpUserId).toBeDefined();

    await db
      .insert(memberships)
      .values({
        userId: hierarchyOpUserId,
        organizationId,
        status: 'active',
        joinedAt: new Date(),
      })
      .onConflictDoNothing({
        target: [memberships.userId, memberships.organizationId],
      });

    const permIds = await db
      .select({ id: permissions.id, key: permissions.key })
      .from(permissions)
      .where(
        inArray(permissions.key, [
          'administration.view',
          'administration.create',
          'administration.update',
        ]),
      );
    const permIdByKey = new Map(permIds.map((p) => [p.key, p.id]));

    for (const key of [
      'administration.view',
      'administration.create',
      'administration.update',
    ]) {
      const permId = permIdByKey.get(key);
      if (permId) {
        await db
          .insert(rolePermissions)
          .values({ roleId: midId, permissionId: permId })
          .onConflictDoNothing({
            target: [rolePermissions.roleId, rolePermissions.permissionId],
          });
      }
    }

    await db
      .insert(userRoles)
      .values({
        userId: hierarchyOpUserId,
        roleId: midId,
        organizationId,
      })
      .onConflictDoNothing({
        target: [userRoles.userId, userRoles.roleId, userRoles.organizationId],
      });

    const opLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: hierarchyOpEmail, password: hierarchyOpPassword })
      .expect(201);
    const opToken = (opLogin.body as { accessToken: string }).accessToken;

    const listRes = await request(app.getHttpServer())
      .get('/api/v1/roles')
      .query({ organizationId, page: 1, pageSize: 50 })
      .set('Authorization', `Bearer ${opToken}`)
      .expect(200);
    const listedIds = (
      listRes.body as { items: Array<{ id: string }> }
    ).items.map((r) => r.id);
    expect(listedIds).toContain(midId);
    expect(listedIds).toContain(leafId);
    expect(listedIds).not.toContain(rootId);

    await request(app.getHttpServer())
      .get(`/api/v1/roles/${rootId}`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${opToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .get(`/api/v1/roles/${leafId}`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${opToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/roles')
      .query({ organizationId })
      .set('Authorization', `Bearer ${opToken}`)
      .send({
        organizationId,
        name: rbacIntegrationTestRoleName('hierarchy.root-blocked'),
        moduleAccess: [{ moduleId: 'dashboard', accessLevel: 'VIEW' }],
      })
      .expect(400);

    await request(app.getHttpServer())
      .delete(`/api/v1/roles/${midId}`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(409);

    await request(app.getHttpServer())
      .delete(`/api/v1/roles/${leafId}`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .delete(`/api/v1/roles/${midId}`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .delete(`/api/v1/roles/${rootId}`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);
  });
});
