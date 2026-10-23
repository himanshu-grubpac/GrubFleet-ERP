/// <reference types="jest" />

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import type { AppDatabase } from '../../database/database.module';
import {
  bootstrapIntegrationAuth,
  ensureUserWithPermissions,
  loginAs,
  type IntegrationAuthContext,
} from '../../../test/helpers/integration-auth';
import { expectAuditLog } from '../../../test/helpers/audit-assert';

const NO_ORG_PERMISSION_USER = {
  email: 'org-locations.viewer@grubpac.local',
  password: 'ViewerTest123!',
  fullName: 'Org Viewer',
  roleName: 'Org Locations Viewer Only',
  permissionKeys: ['administration.view'],
} as const;

type LocationTypeItem = { id: string; name: string; isCustom: boolean };
type LocationTypesResponse = { items: LocationTypeItem[] };
type LocationListItem = { id: string; name: string; status: string };
type PaginatedLocations = { items: LocationListItem[] };
type LocationDetail = { id: string; isActive: boolean; status: string };

describe('Organisation locations (integration)', () => {
  jest.setTimeout(60_000);

  if (process.env.SKIP_DB_INTEGRATION === '1') {
    it.todo('skipped when SKIP_DB_INTEGRATION=1');
    return;
  }

  let ctx: IntegrationAuthContext;
  let app: INestApplication<App>;
  let db: AppDatabase;
  let organizationId: string;
  let accessToken: string;
  /** Member without any organisation.* permission. */
  let viewerToken: string;
  /** Holds organisation.view only. */
  let orgViewOnlyToken: string;
  let officeTypeId: string;
  let employeeFixtureLocationId: string;

  function buildEmployeeCreatePayload(
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> {
    const unique = Date.now();
    return {
      organizationId,
      fullName: 'Integration Employee',
      designation: 'Operations Lead',
      department: 'Operations',
      locationId: employeeFixtureLocationId,
      employmentType: 'full_time',
      dateOfJoining: '2024-01-15',
      phone: `+9198${String(unique).slice(-8)}`,
      email: `employee.${unique}@grubpac.local`,
      ...overrides,
    };
  }

  beforeAll(async () => {
    ctx = await bootstrapIntegrationAuth();
    ({ app, db, organizationId } = ctx);
    accessToken = ctx.adminAccessToken;
    orgViewOnlyToken = ctx.orgViewOnlyAccessToken;

    await ensureUserWithPermissions(db, organizationId, NO_ORG_PERMISSION_USER);
    viewerToken = await loginAs(
      app,
      NO_ORG_PERMISSION_USER.email,
      NO_ORG_PERMISSION_USER.password,
    );

    const typesRes = await request(app.getHttpServer())
      .get('/api/v1/organisation/location-types')
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
    const typesBody = typesRes.body as LocationTypesResponse;
    officeTypeId = typesBody.items.find((t) => t.name === 'Office')?.id ?? '';

    const fixtureLocation = await request(app.getHttpServer())
      .post('/api/v1/organisation/locations')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        name: `Employee Fixture Hub ${Date.now()}`,
        locationTypeId: officeTypeId,
        addressLine1: 'Line 1',
        addressCountry: 'IN',
        addressState: 'Maharashtra',
        addressDistrict: 'Mumbai',
        addressPincode: '400001',
      })
      .expect((res) => expect([200, 201]).toContain(res.status));
    employeeFixtureLocationId = (fixtureLocation.body as LocationDetail).id;
  }, 90000);

  afterAll(async () => {
    await ctx?.close();
  });

  function buildLocationCreatePayload(
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> {
    return {
      organizationId,
      name: `Lattice Location ${Date.now()}`,
      locationTypeId: officeTypeId,
      addressLine1: 'Line 1',
      addressCountry: 'IN',
      addressState: 'Maharashtra',
      addressDistrict: 'Mumbai',
      addressPincode: '400001',
      ...overrides,
    };
  }

  async function createLocationAsAdmin(): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/organisation/locations')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send(buildLocationCreatePayload())
      .expect(201);
    return (res.body as LocationDetail).id;
  }

  async function createEmployeeAsAdmin(): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/organisation/employees')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send(
        buildEmployeeCreatePayload({
          email: `lattice.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@grubpac.local`,
        }),
      )
      .expect(201);
    return (res.body as { id: string }).id;
  }

  describe('security lattice — locations', () => {
    it('returns 401 without JWT on list and create', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/organisation/locations')
        .query({ organizationId })
        .expect(401);
      await request(app.getHttpServer())
        .post('/api/v1/organisation/locations')
        .set('x-organization-id', organizationId)
        .send(buildLocationCreatePayload())
        .expect(401);
    });

    it('allows organisation.view list but returns 403 on create, patch, and status', async () => {
      const id = await createLocationAsAdmin();

      await request(app.getHttpServer())
        .get('/api/v1/organisation/locations')
        .query({ organizationId, page: 1, pageSize: 10 })
        .set('Authorization', `Bearer ${orgViewOnlyToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/v1/organisation/locations')
        .set('Authorization', `Bearer ${orgViewOnlyToken}`)
        .set('x-organization-id', organizationId)
        .send(buildLocationCreatePayload())
        .expect(403);

      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/locations/${id}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${orgViewOnlyToken}`)
        .set('x-organization-id', organizationId)
        .send({ name: 'View Only Cannot Rename' })
        .expect(403);

      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/locations/${id}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${orgViewOnlyToken}`)
        .set('x-organization-id', organizationId)
        .send({ action: 'deactivate', reason: 'View only attempt' })
        .expect(403);
    });

    it('returns 403 or 404 on PATCH with another organisation id (IDOR)', async () => {
      const id = await createLocationAsAdmin();
      const fakeOrgId = '00000000-0000-4000-8000-000000000099';
      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/locations/${id}`)
        .query({ organizationId: fakeOrgId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', fakeOrgId)
        .send({ name: 'Cross Org Rename' })
        .expect((res) => expect([403, 404]).toContain(res.status));
    });

    it('returns 400 for unknown JSON key on create', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/organisation/locations')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send(buildLocationCreatePayload({ isActive: false, hackField: 'x' }))
        .expect(400);
    });

    it('returns 400 for unknown JSON key on PATCH', async () => {
      const id = await createLocationAsAdmin();
      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/locations/${id}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ name: 'Valid Name', hackField: 'x' })
        .expect(400);
    });

    it('returns 403 when organisation context is missing on list', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/organisation/locations')
        .query({ page: 1, pageSize: 10 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);
    });

    it('returns 400 when list search exceeds max length', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/organisation/locations')
        .query({
          organizationId,
          page: 1,
          pageSize: 10,
          search: 'x'.repeat(121),
        })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(400);
    });

    it('returns 400 when list sortBy is not whitelisted', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/organisation/locations')
        .query({
          organizationId,
          page: 1,
          pageSize: 10,
          sortBy: 'hackField',
        })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(400);
    });

    it('returns 403 or 404 on GET with another organisation id (IDOR)', async () => {
      const id = await createLocationAsAdmin();
      const fakeOrgId = '00000000-0000-4000-8000-000000000099';
      await request(app.getHttpServer())
        .get(`/api/v1/organisation/locations/${id}`)
        .query({ organizationId: fakeOrgId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', fakeOrgId)
        .expect((res) => expect([403, 404]).toContain(res.status));
    });

    it('returns 403 when organisation context is missing on create', async () => {
      const { organizationId: _organizationIdOmit, ...bodyWithoutOrg } =
        buildLocationCreatePayload();
      void _organizationIdOmit;
      await request(app.getHttpServer())
        .post('/api/v1/organisation/locations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(bodyWithoutOrg)
        .expect(403);
    });

    it('writes an audit row on deactivate', async () => {
      const id = await createLocationAsAdmin();
      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/locations/${id}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ action: 'deactivate', reason: 'Audit lattice closure' })
        .expect(200);

      const row = await expectAuditLog(db, {
        action: 'organisation.location.deactivate',
        resourceId: id,
        organizationId,
      });
      expect(row.resourceType).toBe('organisation_location');
      expect(row.metadata).toEqual({ reason: 'Audit lattice closure' });
    });
  });

  describe('security lattice — employees', () => {
    it('returns 401 without JWT on list and create', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/organisation/employees')
        .query({ organizationId })
        .expect(401);
      await request(app.getHttpServer())
        .post('/api/v1/organisation/employees')
        .set('x-organization-id', organizationId)
        .send(buildEmployeeCreatePayload())
        .expect(401);
    });

    it('allows organisation.view list but returns 403 on create, patch, and status', async () => {
      const id = await createEmployeeAsAdmin();

      await request(app.getHttpServer())
        .get('/api/v1/organisation/employees')
        .query({ organizationId, page: 1, pageSize: 10 })
        .set('Authorization', `Bearer ${orgViewOnlyToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/v1/organisation/employees')
        .set('Authorization', `Bearer ${orgViewOnlyToken}`)
        .set('x-organization-id', organizationId)
        .send(buildEmployeeCreatePayload())
        .expect(403);

      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/employees/${id}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${orgViewOnlyToken}`)
        .set('x-organization-id', organizationId)
        .send({ fullName: 'View Only Cannot Rename' })
        .expect(403);

      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/employees/${id}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${orgViewOnlyToken}`)
        .set('x-organization-id', organizationId)
        .send({ action: 'deactivate', reasonType: 'resignation' })
        .expect(403);
    });

    it('returns 403 or 404 on GET with another organisation id (IDOR)', async () => {
      const id = await createEmployeeAsAdmin();
      const fakeOrgId = '00000000-0000-4000-8000-000000000099';
      await request(app.getHttpServer())
        .get(`/api/v1/organisation/employees/${id}`)
        .query({ organizationId: fakeOrgId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', fakeOrgId)
        .expect((res) => expect([403, 404]).toContain(res.status));
    });

    it('returns 400 for unknown JSON key on create', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/organisation/employees')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send(buildEmployeeCreatePayload({ employeeCode: 'EMP-HACKED' }))
        .expect(400);
    });

    it('returns 400 for unknown JSON key on PATCH', async () => {
      const id = await createEmployeeAsAdmin();
      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/employees/${id}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ fullName: 'Valid Name', hackField: 'x' })
        .expect(400);
    });

    it('returns 403 when organisation context is missing on list', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/organisation/employees')
        .query({ page: 1, pageSize: 10 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);
    });

    it('returns 400 when list search exceeds max length', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/organisation/employees')
        .query({
          organizationId,
          page: 1,
          pageSize: 10,
          search: 'x'.repeat(121),
        })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(400);
    });

    it('returns 400 when list sortBy is not whitelisted', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/organisation/employees')
        .query({
          organizationId,
          page: 1,
          pageSize: 10,
          sortBy: 'hackField',
        })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(400);
    });

    it('returns 403 or 404 on PATCH with another organisation id (IDOR)', async () => {
      const id = await createEmployeeAsAdmin();
      const fakeOrgId = '00000000-0000-4000-8000-000000000099';
      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/employees/${id}`)
        .query({ organizationId: fakeOrgId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', fakeOrgId)
        .send({ fullName: 'Cross Org Rename' })
        .expect((res) => expect([403, 404]).toContain(res.status));
    });

    it('returns 403 when organisation context is missing on create', async () => {
      const { organizationId: _organizationIdOmit, ...bodyWithoutOrg } =
        buildEmployeeCreatePayload();
      void _organizationIdOmit;
      await request(app.getHttpServer())
        .post('/api/v1/organisation/employees')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(bodyWithoutOrg)
        .expect(403);
    });

    it('returns 400 for invalid employee phone on create', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/organisation/employees')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send(buildEmployeeCreatePayload({ phone: 'not-a-valid-phone' }))
        .expect(400);
    });

    it('returns 400 for non-ISO dateOfJoining on create', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/organisation/employees')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send(buildEmployeeCreatePayload({ dateOfJoining: '14-Jun-2022' }))
        .expect(400);
    });

    it('returns 400 for future dateOfJoining on create', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/organisation/employees')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send(buildEmployeeCreatePayload({ dateOfJoining: '2099-06-14' }))
        .expect(400);
    });

    it('returns 409 when employee email duplicates another in the org', async () => {
      const duplicateEmail = `dup.employee.${Date.now()}@grubpac.local`;
      await request(app.getHttpServer())
        .post('/api/v1/organisation/employees')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send(buildEmployeeCreatePayload({ email: duplicateEmail }))
        .expect(201);

      const conflict = await request(app.getHttpServer())
        .post('/api/v1/organisation/employees')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send(
          buildEmployeeCreatePayload({
            email: duplicateEmail,
            phone: '+919777766661',
          }),
        )
        .expect(409);
      expect((conflict.body as { message?: string }).message).toContain(
        'email',
      );
    });

    it('returns 409 when employee mobile duplicates another in the org', async () => {
      const duplicatePhone = `+9196${String(Date.now()).slice(-8)}`;
      await request(app.getHttpServer())
        .post('/api/v1/organisation/employees')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send(buildEmployeeCreatePayload({ phone: duplicatePhone }))
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/organisation/employees')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send(
          buildEmployeeCreatePayload({
            phone: duplicatePhone,
            email: `other.${Date.now()}@grubpac.local`,
          }),
        )
        .expect(409);
    });

    it('allows employee update with same email and rejects duplicate on another row', async () => {
      const sharedEmail = `employee.shared.${Date.now()}@grubpac.local`;
      const firstId = (
        await request(app.getHttpServer())
          .post('/api/v1/organisation/employees')
          .set('Authorization', `Bearer ${accessToken}`)
          .set('x-organization-id', organizationId)
          .send(buildEmployeeCreatePayload({ email: sharedEmail }))
          .expect(201)
      ).body as { id: string };

      const secondId = (
        await request(app.getHttpServer())
          .post('/api/v1/organisation/employees')
          .set('Authorization', `Bearer ${accessToken}`)
          .set('x-organization-id', organizationId)
          .send(
            buildEmployeeCreatePayload({
              email: `employee.other.${Date.now()}@grubpac.local`,
            }),
          )
          .expect(201)
      ).body as { id: string };

      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/employees/${firstId.id}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ email: sharedEmail })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/employees/${secondId.id}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ email: sharedEmail })
        .expect(409);
    });

    it('writes an audit row on deactivate', async () => {
      const id = await createEmployeeAsAdmin();
      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/employees/${id}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          action: 'deactivate',
          reasonType: 'end_of_contract',
          comment: 'Audit lattice',
        })
        .expect(200);

      const row = await expectAuditLog(db, {
        action: 'organisation.employee.deactivate',
        resourceId: id,
        organizationId,
      });
      expect(row.resourceType).toBe('organisation_employee');
      expect(row.metadata).toEqual({
        reasonType: 'end_of_contract',
        comment: 'Audit lattice',
      });
    });

    it('returns 400 when PATCH on inactive employee', async () => {
      const id = await createEmployeeAsAdmin();

      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/employees/${id}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          action: 'deactivate',
          reasonType: 'resignation',
          comment: 'Inactive edit test',
        })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/employees/${id}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ fullName: 'Should Not Apply' })
        .expect(400);
    });
  });

  it('returns 403 without organisation.view', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/organisation/locations')
      .query({ organizationId })
      .set('Authorization', `Bearer ${viewerToken}`)
      .set('x-organization-id', organizationId)
      .expect(403);
  });

  it('returns 403 without organisation.create on location create', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/organisation/locations')
      .set('Authorization', `Bearer ${viewerToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        name: 'Viewer Cannot Create',
        locationTypeId: officeTypeId,
        addressLine1: 'Line 1',
        addressCountry: 'IN',
        addressState: 'Maharashtra',
        addressDistrict: 'Mumbai',
        addressPincode: '400001',
      })
      .expect(403);
  });

  it('rejects location create when name exceeds max length', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/organisation/locations')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        name: 'x'.repeat(256),
        locationTypeId: officeTypeId,
        addressLine1: 'Line 1',
        addressCountry: 'IN',
        addressState: 'Maharashtra',
        addressDistrict: 'Mumbai',
        addressPincode: '400001',
      })
      .expect(400);
  });

  it('rejects location create with invalid postal characters', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/organisation/locations')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        name: 'Bad Postal Location',
        locationTypeId: officeTypeId,
        addressLine1: '100 Main St',
        addressCountry: 'US',
        addressState: 'California',
        addressDistrict: 'Los Angeles',
        addressPincode: '@invalid',
      })
      .expect(400);
  });

  it('rejects location create with invalid site contact phone', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/organisation/locations')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        name: 'Bad Phone Location',
        locationTypeId: officeTypeId,
        addressLine1: 'Line 1',
        addressCountry: 'IN',
        addressState: 'Maharashtra',
        addressDistrict: 'Mumbai',
        addressPincode: '400001',
        siteContactPhone: 'not-a-phone',
      })
      .expect(400);
  });

  it('returns 400 when required create fields are missing', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/organisation/locations')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        name: 'Incomplete Location',
        locationTypeId: officeTypeId,
        addressLine1: 'Line 1',
      })
      .expect(400);
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
        addressCountry: 'IN',
        addressState: 'Maharashtra',
        addressDistrict: 'Mumbai Suburban',
        addressPincode: '400069',
        siteContactEmail: `hub.${Date.now()}@example.com`,
        siteContactPhone: `+9199${String(Date.now()).slice(-8)}`,
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
        addressCountry: 'IN',
        addressState: 'Maharashtra',
        addressDistrict: 'Mumbai',
        addressPincode: '400001',
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

  it('updates location fields via PATCH', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/organisation/locations')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        name: 'PATCH Update Before',
        locationTypeId: officeTypeId,
        addressLine1: 'Line 1',
        addressCountry: 'IN',
        addressState: 'Maharashtra',
        addressDistrict: 'Mumbai',
        addressPincode: '400004',
      })
      .expect((res) => expect([200, 201]).toContain(res.status));

    const id = (created.body as LocationDetail).id;

    await request(app.getHttpServer())
      .patch(`/api/v1/organisation/locations/${id}`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({ name: 'PATCH Update After' })
      .expect(200);

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/organisation/locations/${id}`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);

    expect((detail.body as { name: string }).name).toBe('PATCH Update After');
  });

  it('activates inactive location via status PATCH', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/organisation/locations')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        name: 'Activate After Deactivate',
        locationTypeId: officeTypeId,
        addressLine1: 'Line 1',
        addressCountry: 'IN',
        addressState: 'Maharashtra',
        addressDistrict: 'Mumbai',
        addressPincode: '400005',
      })
      .expect((res) => expect([200, 201]).toContain(res.status));

    const id = (created.body as LocationDetail).id;

    await request(app.getHttpServer())
      .patch(`/api/v1/organisation/locations/${id}/status`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({ action: 'deactivate', reason: 'Temporary closure' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/v1/organisation/locations/${id}/status`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({ action: 'activate' })
      .expect(200);

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/organisation/locations/${id}`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);

    expect((detail.body as LocationDetail).status).toBe('active');
  });

  it('returns 400 when PATCH on inactive location', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/organisation/locations')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        name: 'Inactive PATCH Block',
        locationTypeId: officeTypeId,
        addressLine1: 'Line 1',
        addressCountry: 'IN',
        addressState: 'Maharashtra',
        addressDistrict: 'Mumbai',
        addressPincode: '400007',
      })
      .expect((res) => expect([200, 201]).toContain(res.status));

    const id = (created.body as LocationDetail).id;

    await request(app.getHttpServer())
      .patch(`/api/v1/organisation/locations/${id}/status`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({ action: 'deactivate', reason: 'Closed permanently' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/v1/organisation/locations/${id}`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({ name: 'Should Not Apply' })
      .expect(400);
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
        addressCountry: 'IN',
        addressState: 'Maharashtra',
        addressDistrict: 'Mumbai',
        addressPincode: '400002',
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

  it('lists locations with newest created first by default', async () => {
    const marker = `SortOrderLoc ${Date.now()}`;
    const createPayload = (name: string) => ({
      organizationId,
      name,
      locationTypeId: officeTypeId,
      addressLine1: 'Line 1',
      addressCountry: 'IN',
      addressState: 'Maharashtra',
      addressDistrict: 'Mumbai',
      addressPincode: '400001',
    });

    const older = await request(app.getHttpServer())
      .post('/api/v1/organisation/locations')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send(createPayload(`${marker} Older`))
      .expect((res) => expect([200, 201]).toContain(res.status));
    const olderId = (older.body as LocationListItem).id;

    const newer = await request(app.getHttpServer())
      .post('/api/v1/organisation/locations')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send(createPayload(`${marker} Newer`))
      .expect((res) => expect([200, 201]).toContain(res.status));
    const newerId = (newer.body as LocationListItem).id;

    const list = await request(app.getHttpServer())
      .get('/api/v1/organisation/locations')
      .query({ organizationId, search: marker, page: 1, pageSize: 10 })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);

    const items = (list.body as PaginatedLocations).items;
    expect(items.map((item) => item.id)).toEqual([newerId, olderId]);
  });

  it('allows form-picker pageSize up to LOCATION_LIST_MAX_PAGE_SIZE', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/organisation/locations')
      .query({
        organizationId,
        page: 1,
        pageSize: 200,
        status: 'active',
      })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/v1/organisation/locations')
      .query({ organizationId, page: 1, pageSize: 201 })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(400);
  });

  it('assigns responsible employee and returns resolved name on location detail', async () => {
    type EmployeeDetail = { id: string; fullName: string };
    type LocationDetailWithPeople = LocationDetail & {
      responsiblePerson: string;
      responsibleEmployeeId: string;
    };

    const employeeRes = await request(app.getHttpServer())
      .post('/api/v1/organisation/employees')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send(
        buildEmployeeCreatePayload({
          fullName: 'Integration Responsible Person',
          email: `responsible.integration.${Date.now()}@grubpac.local`,
        }),
      )
      .expect((res) => expect([200, 201]).toContain(res.status));

    const employee = employeeRes.body as EmployeeDetail;

    const created = await request(app.getHttpServer())
      .post('/api/v1/organisation/locations')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        name: 'Employee Assignment Hub',
        locationTypeId: officeTypeId,
        addressLine1: 'Line 1',
        addressCountry: 'IN',
        addressState: 'Maharashtra',
        addressDistrict: 'Mumbai',
        addressPincode: '400003',
        responsibleEmployeeId: employee.id,
      })
      .expect((res) => expect([200, 201]).toContain(res.status));

    const createdBody = created.body as LocationDetailWithPeople;
    expect(createdBody.responsiblePerson).toBe(employee.fullName);
    expect(createdBody.responsibleEmployeeId).toBe(employee.id);

    const fakeOrgId = '00000000-0000-4000-8000-000000000099';
    await request(app.getHttpServer())
      .get(`/api/v1/organisation/employees/${employee.id}`)
      .query({ organizationId: fakeOrgId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', fakeOrgId)
      .expect((res) => expect([403, 404]).toContain(res.status));
  });

  it('lists employees with newest created first by default', async () => {
    type EmployeeListItem = { id: string; fullName: string };
    type PaginatedEmployees = { items: EmployeeListItem[] };

    const marker = `SortOrderEmp ${Date.now()}`;
    const unique = Date.now();

    const older = await request(app.getHttpServer())
      .post('/api/v1/organisation/employees')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send(
        buildEmployeeCreatePayload({
          fullName: `${marker} Older`,
          phone: `+9191${String(unique).slice(-8)}`,
          email: `sort.older.${unique}@grubpac.local`,
        }),
      )
      .expect((res) => expect([200, 201]).toContain(res.status));
    const olderId = (older.body as EmployeeListItem).id;

    const newer = await request(app.getHttpServer())
      .post('/api/v1/organisation/employees')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send(
        buildEmployeeCreatePayload({
          fullName: `${marker} Newer`,
          phone: `+9192${String(unique + 1).slice(-8)}`,
          email: `sort.newer.${unique}@grubpac.local`,
        }),
      )
      .expect((res) => expect([200, 201]).toContain(res.status));
    const newerId = (newer.body as EmployeeListItem).id;

    const list = await request(app.getHttpServer())
      .get('/api/v1/organisation/employees')
      .query({ organizationId, search: marker, page: 1, pageSize: 10 })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);

    const items = (list.body as PaginatedEmployees).items;
    expect(items.map((item) => item.id)).toEqual([newerId, olderId]);
  });

  it('lists distinct employee departments after create', async () => {
    const customDepartment = `Integration Custom Dept ${Date.now()}`;

    await request(app.getHttpServer())
      .post('/api/v1/organisation/employees')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send(
        buildEmployeeCreatePayload({
          fullName: 'Integration Custom Department Employee',
          department: customDepartment,
          email: `custom.dept.${Date.now()}@grubpac.local`,
        }),
      )
      .expect((res) => expect([200, 201]).toContain(res.status));

    const departmentsRes = await request(app.getHttpServer())
      .get('/api/v1/organisation/employees/departments')
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);

    const body = departmentsRes.body as { items: string[] };
    expect(Array.isArray(body.items)).toBe(true);
    expect(
      body.items.some(
        (name) => name.toLowerCase() === customDepartment.toLowerCase(),
      ),
    ).toBe(true);
  });

  it('creates, updates, deactivates, and reactivates an employee', async () => {
    type EmployeeDetail = {
      id: string;
      fullName: string;
      status: 'active' | 'inactive';
    };

    const unique = Date.now();
    const created = await request(app.getHttpServer())
      .post('/api/v1/organisation/employees')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send(
        buildEmployeeCreatePayload({
          fullName: 'Lifecycle Integration Employee',
          department: `Lifecycle Dept ${unique}`,
          email: `lifecycle.employee.${unique}@grubpac.local`,
        }),
      )
      .expect((res) => expect([200, 201]).toContain(res.status));

    const employee = created.body as EmployeeDetail;
    expect(employee.fullName).toBe('Lifecycle Integration Employee');
    expect(employee.status).toBe('active');

    const updated = await request(app.getHttpServer())
      .patch(`/api/v1/organisation/employees/${employee.id}`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({ fullName: 'Lifecycle Employee Updated' })
      .expect(200);

    expect((updated.body as EmployeeDetail).fullName).toBe(
      'Lifecycle Employee Updated',
    );

    const listSearch = await request(app.getHttpServer())
      .get('/api/v1/organisation/employees')
      .query({
        organizationId,
        search: 'Lifecycle Employee Updated',
        page: 1,
        pageSize: 10,
      })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);

    const listBody = listSearch.body as PaginatedLocations;
    expect(
      listBody.items.some((item: { id: string }) => item.id === employee.id),
    ).toBe(true);

    await request(app.getHttpServer())
      .patch(`/api/v1/organisation/employees/${employee.id}/status`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({ action: 'deactivate', reasonType: 'resignation' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/v1/organisation/employees/${employee.id}`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({ fullName: 'Should Not Apply' })
      .expect(400);

    const reactivated = await request(app.getHttpServer())
      .patch(`/api/v1/organisation/employees/${employee.id}/status`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({ action: 'activate' })
      .expect(200);

    expect((reactivated.body as EmployeeDetail).status).toBe('active');
  });

  it('rejects employee deactivate without reason type', async () => {
    type EmployeeDetail = { id: string };

    const created = await request(app.getHttpServer())
      .post('/api/v1/organisation/employees')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send(
        buildEmployeeCreatePayload({
          fullName: 'Deactivate Validation Employee',
          email: `deactivate.validation.${Date.now()}@grubpac.local`,
        }),
      )
      .expect((res) => expect([200, 201]).toContain(res.status));

    const employee = created.body as EmployeeDetail;

    await request(app.getHttpServer())
      .patch(`/api/v1/organisation/employees/${employee.id}/status`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({ action: 'deactivate' })
      .expect(400);
  });

  it('rejects employee create without full name', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/organisation/employees')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({ ...buildEmployeeCreatePayload(), fullName: '' })
      .expect(400);
  });

  it('rejects employee create when mandatory TSV-aligned fields are missing', async () => {
    const base = buildEmployeeCreatePayload();
    await request(app.getHttpServer())
      .post('/api/v1/organisation/employees')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({ organizationId: base.organizationId, fullName: base.fullName })
      .expect(400);

    const withoutLocation = { ...base };
    delete withoutLocation.locationId;
    await request(app.getHttpServer())
      .post('/api/v1/organisation/employees')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send(withoutLocation)
      .expect(400);
  });

  it('rejects employee create when fullName exceeds max length', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/organisation/employees')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        ...buildEmployeeCreatePayload(),
        fullName: 'x'.repeat(256),
      })
      .expect(400);
  });

  it('returns 403 without organisation.view on employee list', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/organisation/employees')
      .query({ organizationId })
      .set('Authorization', `Bearer ${viewerToken}`)
      .set('x-organization-id', organizationId)
      .expect(403);
  });

  it('returns 403 without organisation.create on employee create', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/organisation/employees')
      .set('Authorization', `Bearer ${viewerToken}`)
      .set('x-organization-id', organizationId)
      .send(buildEmployeeCreatePayload())
      .expect(403);
  });

  it('allows employee list pageSize up to EMPLOYEE_LIST_MAX_PAGE_SIZE', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/organisation/employees')
      .query({ organizationId, page: 1, pageSize: 200 })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/v1/organisation/employees')
      .query({ organizationId, page: 1, pageSize: 201 })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(400);
  });

  it('rejects employee create with location from another organisation', async () => {
    const fakeOrgId = '00000000-0000-4000-8000-000000000099';
    await request(app.getHttpServer())
      .post('/api/v1/organisation/employees')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        ...buildEmployeeCreatePayload(),
        organizationId: fakeOrgId,
      })
      .expect((res) => expect([400, 403]).toContain(res.status));
  });

  it('creates location with US country and ZIP postal code', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/organisation/locations')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        name: 'Los Angeles Office',
        locationTypeId: officeTypeId,
        addressLine1: '100 Main St',
        addressCountry: 'US',
        addressState: 'California',
        addressDistrict: 'Los Angeles',
        addressPincode: '90210',
      })
      .expect((res) => expect([200, 201]).toContain(res.status));

    const body = created.body as {
      addressCountry: string;
      addressPincode: string;
    };
    expect(body.addressCountry).toBe('US');
    expect(body.addressPincode).toBe('90210');
  });
});
