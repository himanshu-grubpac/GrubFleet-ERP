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
  email: 'org-suppliers.viewer@grubpac.local',
  password: 'ViewerTest123!',
  fullName: 'Org Suppliers Viewer Only',
  roleName: 'Org Suppliers Viewer Only',
  permissionKeys: ['administration.view'],
} as const;

type SupplierDetail = { id: string; isActive: boolean; status: string };

describe('Organisation suppliers (integration)', () => {
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
  let viewerToken: string;
  let orgViewOnlyToken: string;

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
  }, 90000);

  afterAll(async () => {
    await ctx?.close();
  });

  function buildSupplierCreatePayload(
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> {
    const unique = Date.now();
    return {
      organizationId,
      name: `Lattice Supplier ${unique}`,
      supplierType: 'spare_parts',
      contactPerson: 'Integration Contact',
      contactPhone: '+919888877770',
      contactEmail: `supplier.${unique}@grubpac.local`,
      agreementReference: `AGR-${unique}`,
      addressLine1: 'Line 1',
      addressCountry: 'IN',
      addressState: 'Maharashtra',
      addressDistrict: 'Mumbai',
      addressPincode: '400001',
      ...overrides,
    };
  }

  async function createSupplierAsAdmin(): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/organisation/suppliers')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send(buildSupplierCreatePayload())
      .expect(201);
    return (res.body as SupplierDetail).id;
  }

  describe('security lattice — suppliers', () => {
    it('returns 401 without JWT on list and create', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/organisation/suppliers')
        .query({ organizationId })
        .expect(401);
      await request(app.getHttpServer())
        .post('/api/v1/organisation/suppliers')
        .set('x-organization-id', organizationId)
        .send(buildSupplierCreatePayload())
        .expect(401);
    });

    it('returns 403 without organisation permission on list', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/organisation/suppliers')
        .query({ organizationId, page: 1, pageSize: 10 })
        .set('Authorization', `Bearer ${viewerToken}`)
        .set('x-organization-id', organizationId)
        .expect(403);
    });

    it('allows organisation.view list but returns 403 on create, patch, and status', async () => {
      const id = await createSupplierAsAdmin();

      await request(app.getHttpServer())
        .get('/api/v1/organisation/suppliers')
        .query({ organizationId, page: 1, pageSize: 10 })
        .set('Authorization', `Bearer ${orgViewOnlyToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/v1/organisation/suppliers')
        .set('Authorization', `Bearer ${orgViewOnlyToken}`)
        .set('x-organization-id', organizationId)
        .send(buildSupplierCreatePayload())
        .expect(403);

      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/suppliers/${id}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${orgViewOnlyToken}`)
        .set('x-organization-id', organizationId)
        .send({ name: 'View Only Cannot Rename' })
        .expect(403);

      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/suppliers/${id}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${orgViewOnlyToken}`)
        .set('x-organization-id', organizationId)
        .send({ action: 'deactivate', reason: 'View only attempt' })
        .expect(403);
    });

    it('returns 403 when organisation context is missing on list', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/organisation/suppliers')
        .query({ page: 1, pageSize: 10 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);
    });

    it('returns 403 or 404 on PATCH with another organisation id (IDOR)', async () => {
      const id = await createSupplierAsAdmin();
      const fakeOrgId = '00000000-0000-4000-8000-000000000099';
      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/suppliers/${id}`)
        .query({ organizationId: fakeOrgId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', fakeOrgId)
        .send({ name: 'Cross Org Rename' })
        .expect((res) => expect([403, 404]).toContain(res.status));
    });

    it('returns 403 or 404 on GET with another organisation id (IDOR)', async () => {
      const id = await createSupplierAsAdmin();
      const fakeOrgId = '00000000-0000-4000-8000-000000000099';
      await request(app.getHttpServer())
        .get(`/api/v1/organisation/suppliers/${id}`)
        .query({ organizationId: fakeOrgId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', fakeOrgId)
        .expect((res) => expect([403, 404]).toContain(res.status));
    });

    it('returns 400 for unknown JSON key on create', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/organisation/suppliers')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send(buildSupplierCreatePayload({ hackField: 'x' }))
        .expect(400);
    });

    it('returns 400 for unknown JSON key on PATCH', async () => {
      const id = await createSupplierAsAdmin();
      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/suppliers/${id}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ name: 'Valid Name', hackField: 'x' })
        .expect(400);
    });

    it('returns 403 when organisation context is missing on create', async () => {
      const { organizationId: _organizationIdOmit, ...bodyWithoutOrg } =
        buildSupplierCreatePayload();
      void _organizationIdOmit;
      await request(app.getHttpServer())
        .post('/api/v1/organisation/suppliers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(bodyWithoutOrg)
        .expect(403);
    });

    it('returns 400 when pageSize exceeds max', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/organisation/suppliers')
        .query({ organizationId, page: 1, pageSize: 51 })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(400);
    });

    it('returns 400 when PATCH on inactive supplier', async () => {
      const id = await createSupplierAsAdmin();
      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/suppliers/${id}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ action: 'deactivate', reason: 'For inactive edit test' })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/suppliers/${id}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ name: 'Cannot Edit Inactive' })
        .expect(400);
    });

    it('returns 400 when deactivating inactive supplier', async () => {
      const id = await createSupplierAsAdmin();
      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/suppliers/${id}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ action: 'deactivate', reason: 'First deactivate' })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/suppliers/${id}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ action: 'deactivate', reason: 'Again' })
        .expect(400);
    });

    it('writes an audit row on deactivate', async () => {
      const id = await createSupplierAsAdmin();
      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/suppliers/${id}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ action: 'deactivate', reason: 'Audit lattice closure' })
        .expect(200);

      const row = await expectAuditLog(db, {
        action: 'organisation.supplier.deactivate',
        resourceId: id,
        organizationId,
      });
      expect(row.resourceType).toBe('organisation_supplier');
      expect(row.metadata).toEqual({ reason: 'Audit lattice closure' });
    });

    it('returns 400 for invalid addressCountry on create', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/organisation/suppliers')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send(buildSupplierCreatePayload({ addressCountry: 'ZZ' }))
        .expect(400);
    });

    it('returns 400 when addressLine1 exceeds max length', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/organisation/suppliers')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send(buildSupplierCreatePayload({ addressLine1: 'x'.repeat(256) }))
        .expect(400);
    });

    it('returns 400 for invalid US postal code on create', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/organisation/suppliers')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send(
          buildSupplierCreatePayload({
            addressCountry: 'US',
            addressState: 'California',
            addressDistrict: 'Los Angeles',
            addressPincode: 'not-a-zip',
          }),
        )
        .expect(400);
    });

    it('returns 401 without JWT on supplier types catalog', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/organisation/suppliers/types')
        .query({ organizationId })
        .expect(401);
    });

    it('returns 403 without organisation permission on supplier types catalog', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/organisation/suppliers/types')
        .query({ organizationId })
        .set('Authorization', `Bearer ${viewerToken}`)
        .set('x-organization-id', organizationId)
        .expect(403);
    });

    it('returns supplier types catalog for organisation.view', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/organisation/suppliers/types')
        .query({ organizationId })
        .set('Authorization', `Bearer ${orgViewOnlyToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);
      const body = res.body as {
        items: Array<{ key: string; label: string }>;
      };
      expect(body.items.map((item) => item.key).sort()).toEqual([
        'bike',
        'compliance',
        'driver',
        'spare_parts',
      ]);
      expect(body.items.find((item) => item.key === 'bike')?.label).toBe(
        'Bike',
      );
    });

    it('lists only inactive suppliers when status=inactive', async () => {
      const id = await createSupplierAsAdmin();
      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/suppliers/${id}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ action: 'deactivate', reason: 'Inactive filter test' })
        .expect(200);

      const inactiveRes = await request(app.getHttpServer())
        .get('/api/v1/organisation/suppliers')
        .query({ organizationId, page: 1, pageSize: 50, status: 'inactive' })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);
      const inactiveBody = inactiveRes.body as {
        items: Array<{ id: string; status: string }>;
      };
      expect(inactiveBody.items.some((row) => row.id === id)).toBe(true);
      expect(inactiveBody.items.every((row) => row.status === 'inactive')).toBe(
        true,
      );

      const activeRes = await request(app.getHttpServer())
        .get('/api/v1/organisation/suppliers')
        .query({ organizationId, page: 1, pageSize: 50, status: 'active' })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);
      const activeBody = activeRes.body as {
        items: Array<{ id: string }>;
      };
      expect(activeBody.items.some((row) => row.id === id)).toBe(false);
    });

    it('returns detail with empty linked parts for spare_parts suppliers', async () => {
      const id = await createSupplierAsAdmin();
      const res = await request(app.getHttpServer())
        .get(`/api/v1/organisation/suppliers/${id}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);
      const body = res.body as {
        supplierType: string;
        linkedSections: {
          reliability: { title: string; items: unknown[] } | null;
          linked: { title: string; items: unknown[] };
        };
      };
      expect(body.linkedSections.linked.title).toBe('Linked parts');
      expect(body.linkedSections.linked.items).toEqual([]);
      expect(body.linkedSections.reliability?.title).toBe(
        'Delivery reliability',
      );
      expect(body.linkedSections.reliability?.items ?? []).toEqual([]);
    });

    it('returns linked drivers on driver-type supplier detail', async () => {
      const unique = Date.now();
      const supplierRes = await request(app.getHttpServer())
        .post('/api/v1/organisation/suppliers')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send(
          buildSupplierCreatePayload({
            name: `Staffing Supplier ${unique}`,
            supplierType: 'driver',
          }),
        )
        .expect(201);
      const supplierId = (supplierRes.body as { id: string }).id;

      const driverRes = await request(app.getHttpServer())
        .post('/api/v1/organisation/drivers')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          name: `Linked Driver ${unique}`,
          cprNo: String(unique).slice(-9).padStart(9, '0'),
          phone: '+919888877773',
          email: `linked.driver.${unique}@grubpac.local`,
          licenseNumber: `DL-LINK-${unique}`,
          licenseExpiry: '2028-12-31',
          supplierId,
          addressLine1: 'Line 1',
          addressCountry: 'IN',
          addressState: 'Maharashtra',
          addressDistrict: 'Mumbai',
          addressPincode: '400001',
        })
        .expect(201);
      const driverId = (driverRes.body as { id: string }).id;

      const detailRes = await request(app.getHttpServer())
        .get(`/api/v1/organisation/suppliers/${supplierId}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);
      const detail = detailRes.body as {
        linkedSections: {
          linked: {
            title: string;
            total?: number;
            items: Array<{ id: string; driver: string }>;
          };
        };
      };
      expect(detail.linkedSections.linked.title).toBe('Linked drivers');
      expect(detail.linkedSections.linked.total).toBeGreaterThanOrEqual(1);
      expect(
        detail.linkedSections.linked.items.some((row) => row.id === driverId),
      ).toBe(true);

      await request(app.getHttpServer())
        .get(`/api/v1/organisation/suppliers/${supplierId}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${viewerToken}`)
        .set('x-organization-id', organizationId)
        .expect(403);
    });
  });
});
