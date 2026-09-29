/// <reference types="jest" />

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
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

type AuthLoginResponse = { accessToken: string };
type LocationTypeItem = { id: string; name: string; isCustom: boolean };
type LocationTypesResponse = { items: LocationTypeItem[] };
type LocationListItem = { id: string; name: string; status: string };
type PaginatedLocations = { items: LocationListItem[] };
type LocationDetail = { id: string; isActive: boolean; status: string };

describe('Organisation locations (integration)', () => {
  if (process.env.SKIP_DB_INTEGRATION === '1') {
    it.todo('skipped when SKIP_DB_INTEGRATION=1');
    return;
  }

  let app: INestApplication<App>;
  let pool: Pool;
  let organizationId: string;
  let accessToken: string;
  let viewerToken: string;
  let officeTypeId: string;

  beforeAll(async () => {
    const connectionString =
      process.env.DATABASE_URL ??
      'postgresql://grubpac:grubpac_dev@localhost:5432/grubpac_erp';
    pool = new Pool({ connectionString });
    await pool.query('SELECT 1');
    await ensureTestSchema();
    const db = drizzle(pool, { schema });
    await seedDevAdminBootstrap(db);

    const [org] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, DEV_ORG_SLUG))
      .limit(1);
    organizationId = org?.id ?? '';

    const viewerEmail = 'org-locations.viewer@grubpac.local';
    const viewerPassword = 'ViewerTest123!';
    const passwordHash = await bcrypt.hash(viewerPassword, 12);
    await db
      .insert(users)
      .values({
        email: viewerEmail,
        passwordHash,
        fullName: 'Org Viewer',
        isActive: true,
      })
      .onConflictDoNothing({ target: users.email });

    const [viewerUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, viewerEmail))
      .limit(1);

    await db
      .insert(memberships)
      .values({
        userId: viewerUser.id,
        organizationId,
        status: 'active',
        joinedAt: new Date(),
      })
      .onConflictDoNothing({
        target: [memberships.userId, memberships.organizationId],
      });

    const [adminViewPerm] = await db
      .select({ id: permissions.id })
      .from(permissions)
      .where(eq(permissions.key, 'administration.view'))
      .limit(1);

    const [viewerRole] = await db
      .insert(roles)
      .values({
        organizationId,
        name: 'Org Locations Viewer Only',
        scope: 'organization',
        isSystem: false,
        isActive: true,
      })
      .onConflictDoNothing()
      .returning({ id: roles.id });

    let viewerRoleId = viewerRole?.id;
    if (!viewerRoleId) {
      const [existing] = await db
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.name, 'Org Locations Viewer Only'))
        .limit(1);
      viewerRoleId = existing?.id;
    }

    if (viewerRoleId && adminViewPerm?.id) {
      await db
        .insert(rolePermissions)
        .values({ roleId: viewerRoleId, permissionId: adminViewPerm.id })
        .onConflictDoNothing({
          target: [rolePermissions.roleId, rolePermissions.permissionId],
        });
      await db
        .insert(userRoles)
        .values({
          userId: viewerUser.id,
          roleId: viewerRoleId,
          organizationId,
        })
        .onConflictDoNothing({
          target: [
            userRoles.userId,
            userRoles.roleId,
            userRoles.organizationId,
          ],
        });
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.useGlobalFilters(new GlobalHttpExceptionFilter());
    app.setGlobalPrefix('api/v1');
    await app.init();

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: DEV_ADMIN_EMAIL, password: DEV_ADMIN_PASSWORD });
    accessToken = (login.body as AuthLoginResponse).accessToken;

    const viewerLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: viewerEmail, password: viewerPassword });
    viewerToken = (viewerLogin.body as AuthLoginResponse).accessToken;

    const typesRes = await request(app.getHttpServer())
      .get('/api/v1/organisation/location-types')
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
    const typesBody = typesRes.body as LocationTypesResponse;
    officeTypeId = typesBody.items.find((t) => t.name === 'Office')?.id ?? '';
  });

  afterAll(async () => {
    await app?.close();
    await pool?.end();
  });

  it('returns 403 without organisation.view', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/organisation/locations')
      .query({ organizationId })
      .set('Authorization', `Bearer ${viewerToken}`)
      .set('x-organization-id', organizationId)
      .expect(403);
  });

  it('creates location and enforces tenant isolation on get', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/organisation/locations')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        name: 'Andheri East Hub',
        locationTypeId: officeTypeId,
        addressLine1: 'Plot 12',
        addressCity: 'Mumbai',
        addressState: 'Maharashtra',
        addressDistrict: 'Mumbai Suburban',
        addressPincode: '400069',
        siteContactEmail: 'hub@example.com',
        siteContactPhone: '+919999999999',
      })
      .expect((res) => expect([200, 201]).toContain(res.status));

    const createdBody = created.body as LocationDetail;
    const fakeOrgId = '00000000-0000-4000-8000-000000000099';

    await request(app.getHttpServer())
      .get(`/api/v1/organisation/locations/${createdBody.id}`)
      .query({ organizationId: fakeOrgId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', fakeOrgId)
      .expect((res) => expect([403, 404]).toContain(res.status));
  });

  it('requires reason to deactivate', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/organisation/locations')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        name: 'Deactivate Reason Test',
        locationTypeId: officeTypeId,
        addressLine1: 'Line 1',
      })
      .expect((res) => expect([200, 201]).toContain(res.status));

    const id = (created.body as LocationDetail).id;

    await request(app.getHttpServer())
      .patch(`/api/v1/organisation/locations/${id}/status`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({ action: 'deactivate' })
      .expect(400);

    await request(app.getHttpServer())
      .patch(`/api/v1/organisation/locations/${id}/status`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({ action: 'deactivate', reason: 'Office closed for renovation' })
      .expect(200);

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/organisation/locations/${id}`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);

    expect((detail.body as LocationDetail).status).toBe('inactive');
  });

  it('cannot delete in-use location type', async () => {
    const uniqueTypeName = `Integration Custom Type ${Date.now()}`;
    const customType = await request(app.getHttpServer())
      .post('/api/v1/organisation/location-types')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({ organizationId, name: uniqueTypeName })
      .expect((res) => expect([200, 201]).toContain(res.status));

    const typeId = (customType.body as LocationTypeItem).id;

    await request(app.getHttpServer())
      .post('/api/v1/organisation/locations')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        name: 'Uses Custom Type',
        locationTypeId: typeId,
        addressLine1: 'Line 1',
      })
      .expect((res) => expect([200, 201]).toContain(res.status));

    await request(app.getHttpServer())
      .delete(`/api/v1/organisation/location-types/${typeId}`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(409);
  });

  it('lists locations with pagination', async () => {
    const list = await request(app.getHttpServer())
      .get('/api/v1/organisation/locations')
      .query({ organizationId, page: 1, pageSize: 10 })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);

    const body = list.body as PaginatedLocations;
    expect(Array.isArray(body.items)).toBe(true);
  });
});
