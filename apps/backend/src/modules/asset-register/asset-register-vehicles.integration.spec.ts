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

const NO_ASSET_PERMISSION_USER = {
  email: 'asset-vehicles.viewer@grubpac.local',
  password: 'ViewerTest123!',
  fullName: 'Asset Vehicle Viewer Only',
  roleName: 'Asset Vehicle Viewer Only',
  permissionKeys: ['administration.view'],
} as const;

const ASSET_VIEW_ONLY_USER = {
  email: 'asset.vehicle.viewonly@grubpac.local',
  password: 'AssetViewOnly123!',
  fullName: 'Asset Vehicle View Only',
  roleName: 'Asset Vehicle View Only',
  permissionKeys: ['asset_register.view'],
} as const;

type VehicleDetail = {
  id: string;
  fleetCode: string;
  registrationNumber: string;
  assetClassId: string;
  assetMasterId: string;
  assetClassName: string;
  assetMasterName: string;
  operationalStatus: string;
  isActive: boolean;
  status: string;
};

describe('Asset Register — fleet register vehicles (integration)', () => {
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
  let assetViewOnlyToken: string;

  beforeAll(async () => {
    ctx = await bootstrapIntegrationAuth();
    ({ app, db, organizationId } = ctx);
    accessToken = ctx.adminAccessToken;

    await ensureUserWithPermissions(
      db,
      organizationId,
      NO_ASSET_PERMISSION_USER,
    );
    viewerToken = await loginAs(
      app,
      NO_ASSET_PERMISSION_USER.email,
      NO_ASSET_PERMISSION_USER.password,
    );

    await ensureUserWithPermissions(db, organizationId, ASSET_VIEW_ONLY_USER);
    assetViewOnlyToken = await loginAs(
      app,
      ASSET_VIEW_ONLY_USER.email,
      ASSET_VIEW_ONLY_USER.password,
    );
  }, 90000);

  afterAll(async () => {
    await ctx?.close();
  });

  function buildAssetClassPayload(
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> {
    const unique = Date.now();
    return {
      organizationId,
      name: `Vehicle Lattice Class ${unique}`,
      vehicleType: '4W',
      fuelType: 'Diesel',
      fuelTankCapacity: 60,
      ratedLoadFrom: 500,
      ratedLoadTo: 1500,
      ...overrides,
    };
  }

  async function createAssetClass(
    overrides: Record<string, unknown> = {},
  ): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/asset-register/asset-classes')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send(buildAssetClassPayload(overrides))
      .expect(201);
    return (res.body as { id: string }).id;
  }

  async function createMaster(
    assetClassId: string,
    overrides: Record<string, unknown> = {},
  ): Promise<string> {
    const unique = Date.now();
    const res = await request(app.getHttpServer())
      .post('/api/v1/asset-register/asset-masters')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        assetClassId,
        name: `Master ${unique}`,
        ...overrides,
      })
      .expect(201);
    return (res.body as { id: string }).id;
  }

  function buildVehiclePayload(
    assetClassId: string,
    assetMasterId: string,
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> {
    const unique = Date.now();
    return {
      organizationId,
      assetClassId,
      assetMasterId,
      registrationNumber: `REG-${unique}`.slice(0, 32),
      chassisNumber: `CH-${unique}`,
      modelYear: 2024,
      odometer: 100,
      registrationStartDate: '2024-01-01',
      registrationEndDate: '2029-01-01',
      insuranceStartDate: '2024-01-01',
      insuranceEndDate: '2025-01-01',
      insurancePremium: 12000,
      warrantyStartDate: '2024-01-01',
      warrantyEndDate: '2027-01-01',
      ...overrides,
    };
  }

  async function createVehicleAsAdmin(
    assetClassId: string,
    assetMasterId: string,
    overrides: Record<string, unknown> = {},
  ): Promise<VehicleDetail> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/asset-register/vehicles')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send(buildVehiclePayload(assetClassId, assetMasterId, overrides))
      .expect(201);
    return res.body as VehicleDetail;
  }

  describe('security lattice — fleet register vehicles', () => {
    it('returns 401 without JWT on list and create', async () => {
      const classId = await createAssetClass();
      const masterId = await createMaster(classId);
      await request(app.getHttpServer())
        .get('/api/v1/asset-register/vehicles')
        .query({ organizationId })
        .expect(401);
      await request(app.getHttpServer())
        .post('/api/v1/asset-register/vehicles')
        .set('x-organization-id', organizationId)
        .send(buildVehiclePayload(classId, masterId))
        .expect(401);
    });

    it('returns 403 without asset_register permission on list', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/asset-register/vehicles')
        .query({ organizationId, page: 1, pageSize: 10 })
        .set('Authorization', `Bearer ${viewerToken}`)
        .set('x-organization-id', organizationId)
        .expect(403);
    });

    it('allows asset_register.view list but returns 403 on create, patch, and status', async () => {
      const classId = await createAssetClass();
      const masterId = await createMaster(classId);
      const created = await createVehicleAsAdmin(classId, masterId);

      await request(app.getHttpServer())
        .get('/api/v1/asset-register/vehicles')
        .query({ organizationId, page: 1, pageSize: 10 })
        .set('Authorization', `Bearer ${assetViewOnlyToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/v1/asset-register/vehicles')
        .set('Authorization', `Bearer ${assetViewOnlyToken}`)
        .set('x-organization-id', organizationId)
        .send(buildVehiclePayload(classId, masterId))
        .expect(403);

      await request(app.getHttpServer())
        .patch(`/api/v1/asset-register/vehicles/${created.id}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${assetViewOnlyToken}`)
        .set('x-organization-id', organizationId)
        .send({ odometer: 200 })
        .expect(403);

      await request(app.getHttpServer())
        .patch(`/api/v1/asset-register/vehicles/${created.id}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${assetViewOnlyToken}`)
        .set('x-organization-id', organizationId)
        .send({ action: 'deactivate', reason: 'View only attempt' })
        .expect(403);
    });

    it('returns 403 when organisation context is missing on list', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/asset-register/vehicles')
        .query({ page: 1, pageSize: 10 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);
    });

    it('returns 403 or 404 on PATCH with another organisation id (IDOR)', async () => {
      const classId = await createAssetClass();
      const masterId = await createMaster(classId);
      const created = await createVehicleAsAdmin(classId, masterId);
      const fakeOrgId = '00000000-0000-4000-8000-000000000099';
      await request(app.getHttpServer())
        .patch(`/api/v1/asset-register/vehicles/${created.id}`)
        .query({ organizationId: fakeOrgId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', fakeOrgId)
        .send({ odometer: 999 })
        .expect((res) => expect([403, 404]).toContain(res.status));
    });

    it('returns 403 or 404 on GET with another organisation id (IDOR)', async () => {
      const classId = await createAssetClass();
      const masterId = await createMaster(classId);
      const created = await createVehicleAsAdmin(classId, masterId);
      const fakeOrgId = '00000000-0000-4000-8000-000000000099';
      await request(app.getHttpServer())
        .get(`/api/v1/asset-register/vehicles/${created.id}`)
        .query({ organizationId: fakeOrgId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', fakeOrgId)
        .expect((res) => expect([403, 404]).toContain(res.status));
    });

    it('returns 400 for unknown JSON key on create', async () => {
      const classId = await createAssetClass();
      const masterId = await createMaster(classId);
      await request(app.getHttpServer())
        .post('/api/v1/asset-register/vehicles')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send(buildVehiclePayload(classId, masterId, { hackField: 'x' }))
        .expect(400);
    });

    it('returns 400 for unknown JSON key on PATCH', async () => {
      const classId = await createAssetClass();
      const masterId = await createMaster(classId);
      const created = await createVehicleAsAdmin(classId, masterId);
      await request(app.getHttpServer())
        .patch(`/api/v1/asset-register/vehicles/${created.id}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ odometer: 200, hackField: 'x' })
        .expect(400);
    });

    it('returns 400 when pageSize exceeds max', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/asset-register/vehicles')
        .query({ organizationId, page: 1, pageSize: 51 })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(400);
    });

    it('returns 400 when PATCH on inactive vehicle', async () => {
      const classId = await createAssetClass();
      const masterId = await createMaster(classId);
      const created = await createVehicleAsAdmin(classId, masterId);
      await request(app.getHttpServer())
        .patch(`/api/v1/asset-register/vehicles/${created.id}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ action: 'deactivate', reason: 'For inactive edit test' })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/v1/asset-register/vehicles/${created.id}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ odometer: 500 })
        .expect(400);
    });

    it('returns 400 when deactivating inactive vehicle', async () => {
      const classId = await createAssetClass();
      const masterId = await createMaster(classId);
      const created = await createVehicleAsAdmin(classId, masterId);
      await request(app.getHttpServer())
        .patch(`/api/v1/asset-register/vehicles/${created.id}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ action: 'deactivate', reason: 'First deactivate' })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/v1/asset-register/vehicles/${created.id}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ action: 'deactivate', reason: 'Again' })
        .expect(400);
    });

    it('writes an audit row on deactivate', async () => {
      const classId = await createAssetClass();
      const masterId = await createMaster(classId);
      const created = await createVehicleAsAdmin(classId, masterId);
      await request(app.getHttpServer())
        .patch(`/api/v1/asset-register/vehicles/${created.id}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ action: 'deactivate', reason: 'Audit lattice closure' })
        .expect(200);

      const row = await expectAuditLog(db, {
        action: 'asset_register.vehicle.deactivate',
        resourceId: created.id,
        organizationId,
      });
      expect(row.resourceType).toBe('asset_register_vehicle');
      expect(row.metadata).toEqual({ reason: 'Audit lattice closure' });
    });

    it('returns 400 when creating vehicle for inactive asset class', async () => {
      const classId = await createAssetClass();
      const masterId = await createMaster(classId);
      await request(app.getHttpServer())
        .patch(`/api/v1/asset-register/asset-classes/${classId}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ action: 'deactivate', reason: 'Class inactive' })
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/v1/asset-register/vehicles')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send(buildVehiclePayload(classId, masterId))
        .expect(400);
    });

    it('returns 400 when master does not belong to class', async () => {
      const classA = await createAssetClass();
      const classB = await createAssetClass();
      const masterB = await createMaster(classB);
      await request(app.getHttpServer())
        .post('/api/v1/asset-register/vehicles')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send(buildVehiclePayload(classA, masterB))
        .expect(400);
    });

    it('returns 400 when registration end is before start', async () => {
      const classId = await createAssetClass();
      const masterId = await createMaster(classId);
      await request(app.getHttpServer())
        .post('/api/v1/asset-register/vehicles')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send(
          buildVehiclePayload(classId, masterId, {
            registrationStartDate: '2025-01-01',
            registrationEndDate: '2024-01-01',
          }),
        )
        .expect(400);
    });

    it('assigns sequential fleet codes and defaults operationalStatus available', async () => {
      const classId = await createAssetClass();
      const masterId = await createMaster(classId);
      const first = await createVehicleAsAdmin(classId, masterId);
      const second = await createVehicleAsAdmin(classId, masterId);
      expect(first.fleetCode).toMatch(/^VH-\d+$/);
      expect(second.fleetCode).toMatch(/^VH-\d+$/);
      expect(Number(second.fleetCode.slice(3))).toBeGreaterThan(
        Number(first.fleetCode.slice(3)),
      );
      expect(first.operationalStatus).toBe('available');
    });

    it('joins class and master names on detail', async () => {
      const classId = await createAssetClass({ name: 'Detail Class Name' });
      const masterId = await createMaster(classId, { name: 'Detail Master' });
      const created = await createVehicleAsAdmin(classId, masterId);
      const detail = await request(app.getHttpServer())
        .get(`/api/v1/asset-register/vehicles/${created.id}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);
      const body = detail.body as VehicleDetail;
      expect(body.assetClassName).toContain('Detail Class Name');
      expect(body.assetMasterName).toBe('Detail Master');
    });

    it('filters list by assetClassId and operationalStatus', async () => {
      const classA = await createAssetClass();
      const classB = await createAssetClass();
      const masterA = await createMaster(classA);
      const masterB = await createMaster(classB);
      const vehicleA = await createVehicleAsAdmin(classA, masterA);
      await createVehicleAsAdmin(classB, masterB);

      const byClass = await request(app.getHttpServer())
        .get('/api/v1/asset-register/vehicles')
        .query({
          organizationId,
          page: 1,
          pageSize: 50,
          assetClassId: classA,
        })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);
      const classItems = (byClass.body as { items: Array<{ id: string }> })
        .items;
      expect(classItems.some((row) => row.id === vehicleA.id)).toBe(true);
      expect(classItems.every((row) => row.id !== undefined)).toBe(true);

      const byOp = await request(app.getHttpServer())
        .get('/api/v1/asset-register/vehicles')
        .query({
          organizationId,
          page: 1,
          pageSize: 50,
          operationalStatus: 'available',
        })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);
      expect(
        (byOp.body as { items: Array<{ operationalStatus: string }> }).items
          .length,
      ).toBeGreaterThan(0);
    });

    it('updates inFleetCount on asset class list for active vehicles', async () => {
      const classId = await createAssetClass();
      const masterId = await createMaster(classId);
      await createVehicleAsAdmin(classId, masterId);

      const list = await request(app.getHttpServer())
        .get('/api/v1/asset-register/asset-classes')
        .query({ organizationId, page: 1, pageSize: 50 })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);
      const items = (
        list.body as { items: Array<{ id: string; inFleetCount: number }> }
      ).items;
      const row = items.find((item) => item.id === classId);
      expect(row?.inFleetCount).toBeGreaterThanOrEqual(1);
    });

    it('accepts purchaseInvoiceId UUID without Finance validation', async () => {
      const classId = await createAssetClass();
      const masterId = await createMaster(classId);
      const invoiceId = '11111111-1111-4111-8111-111111111111';
      const created = await createVehicleAsAdmin(classId, masterId, {
        purchaseInvoiceId: invoiceId,
      });
      expect(created.id).toBeDefined();
      const detail = await request(app.getHttpServer())
        .get(`/api/v1/asset-register/vehicles/${created.id}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);
      expect(
        (detail.body as { purchaseInvoiceId: string }).purchaseInvoiceId,
      ).toBe(invoiceId);
    });

    it('returns 403 on GET detail without asset_register.view', async () => {
      const classId = await createAssetClass();
      const masterId = await createMaster(classId);
      const created = await createVehicleAsAdmin(classId, masterId);
      await request(app.getHttpServer())
        .get(`/api/v1/asset-register/vehicles/${created.id}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${viewerToken}`)
        .set('x-organization-id', organizationId)
        .expect(403);
    });
  });
});
