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
  email: 'asset-masters.viewer@grubpac.local',
  password: 'ViewerTest123!',
  fullName: 'Asset Master Viewer Only',
  roleName: 'Asset Master Viewer Only',
  permissionKeys: ['administration.view'],
} as const;

const ASSET_VIEW_ONLY_USER = {
  email: 'asset.master.viewonly@grubpac.local',
  password: 'AssetViewOnly123!',
  fullName: 'Asset Master View Only',
  roleName: 'Asset Master View Only',
  permissionKeys: ['asset_register.view'],
} as const;

type AssetMasterDetail = {
  id: string;
  name: string;
  assetClassId: string;
  vehicleType: string;
  isActive: boolean;
  status: string;
};

describe('Asset Register — asset masters (integration)', () => {
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
      name: `Master Lattice Class ${unique}`,
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

  function buildMasterCreatePayload(
    assetClassId: string,
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> {
    const unique = Date.now();
    return {
      organizationId,
      assetClassId,
      name: `Splendor ${unique}`,
      ...overrides,
    };
  }

  async function createMasterAsAdmin(
    assetClassId: string,
    overrides: Record<string, unknown> = {},
  ): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/asset-register/asset-masters')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send(buildMasterCreatePayload(assetClassId, overrides))
      .expect(201);
    return (res.body as AssetMasterDetail).id;
  }

  describe('security lattice — asset masters', () => {
    it('returns 401 without JWT on list and create', async () => {
      const classId = await createAssetClass();
      await request(app.getHttpServer())
        .get('/api/v1/asset-register/asset-masters')
        .query({ organizationId })
        .expect(401);
      await request(app.getHttpServer())
        .post('/api/v1/asset-register/asset-masters')
        .set('x-organization-id', organizationId)
        .send(buildMasterCreatePayload(classId))
        .expect(401);
    });

    it('returns 403 without asset_register permission on list', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/asset-register/asset-masters')
        .query({ organizationId, page: 1, pageSize: 10 })
        .set('Authorization', `Bearer ${viewerToken}`)
        .set('x-organization-id', organizationId)
        .expect(403);
    });

    it('allows asset_register.view list but returns 403 on create, patch, and status', async () => {
      const classId = await createAssetClass();
      const id = await createMasterAsAdmin(classId);

      await request(app.getHttpServer())
        .get('/api/v1/asset-register/asset-masters')
        .query({ organizationId, page: 1, pageSize: 10 })
        .set('Authorization', `Bearer ${assetViewOnlyToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/v1/asset-register/asset-masters')
        .set('Authorization', `Bearer ${assetViewOnlyToken}`)
        .set('x-organization-id', organizationId)
        .send(buildMasterCreatePayload(classId))
        .expect(403);

      await request(app.getHttpServer())
        .patch(`/api/v1/asset-register/asset-masters/${id}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${assetViewOnlyToken}`)
        .set('x-organization-id', organizationId)
        .send({ name: 'View Only Cannot Rename' })
        .expect(403);

      await request(app.getHttpServer())
        .patch(`/api/v1/asset-register/asset-masters/${id}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${assetViewOnlyToken}`)
        .set('x-organization-id', organizationId)
        .send({ action: 'deactivate', reason: 'View only attempt' })
        .expect(403);
    });

    it('returns 403 when organisation context is missing on list', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/asset-register/asset-masters')
        .query({ page: 1, pageSize: 10 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);
    });

    it('returns 403 or 404 on PATCH with another organisation id (IDOR)', async () => {
      const classId = await createAssetClass();
      const id = await createMasterAsAdmin(classId);
      const fakeOrgId = '00000000-0000-4000-8000-000000000099';
      await request(app.getHttpServer())
        .patch(`/api/v1/asset-register/asset-masters/${id}`)
        .query({ organizationId: fakeOrgId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', fakeOrgId)
        .send({ name: 'Cross Org Rename' })
        .expect((res) => expect([403, 404]).toContain(res.status));
    });

    it('returns 403 or 404 on GET with another organisation id (IDOR)', async () => {
      const classId = await createAssetClass();
      const id = await createMasterAsAdmin(classId);
      const fakeOrgId = '00000000-0000-4000-8000-000000000099';
      await request(app.getHttpServer())
        .get(`/api/v1/asset-register/asset-masters/${id}`)
        .query({ organizationId: fakeOrgId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', fakeOrgId)
        .expect((res) => expect([403, 404]).toContain(res.status));
    });

    it('returns 400 for unknown JSON key on create', async () => {
      const classId = await createAssetClass();
      await request(app.getHttpServer())
        .post('/api/v1/asset-register/asset-masters')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send(buildMasterCreatePayload(classId, { hackField: 'x' }))
        .expect(400);
    });

    it('returns 400 for unknown JSON key on PATCH', async () => {
      const classId = await createAssetClass();
      const id = await createMasterAsAdmin(classId);
      await request(app.getHttpServer())
        .patch(`/api/v1/asset-register/asset-masters/${id}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ name: 'Valid Name', hackField: 'x' })
        .expect(400);
    });

    it('returns 403 when organisation context is missing on create', async () => {
      const classId = await createAssetClass();
      const { organizationId: _omit, ...bodyWithoutOrg } =
        buildMasterCreatePayload(classId);
      void _omit;
      await request(app.getHttpServer())
        .post('/api/v1/asset-register/asset-masters')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(bodyWithoutOrg)
        .expect(403);
    });

    it('returns 400 when pageSize exceeds max', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/asset-register/asset-masters')
        .query({ organizationId, page: 1, pageSize: 51 })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(400);
    });

    it('returns 400 when PATCH on inactive asset master', async () => {
      const classId = await createAssetClass();
      const id = await createMasterAsAdmin(classId);
      await request(app.getHttpServer())
        .patch(`/api/v1/asset-register/asset-masters/${id}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ action: 'deactivate', reason: 'For inactive edit test' })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/v1/asset-register/asset-masters/${id}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ name: 'Cannot Edit Inactive' })
        .expect(400);
    });

    it('returns 400 when deactivating inactive asset master', async () => {
      const classId = await createAssetClass();
      const id = await createMasterAsAdmin(classId);
      await request(app.getHttpServer())
        .patch(`/api/v1/asset-register/asset-masters/${id}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ action: 'deactivate', reason: 'First deactivate' })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/v1/asset-register/asset-masters/${id}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ action: 'deactivate', reason: 'Again' })
        .expect(400);
    });

    it('writes an audit row on deactivate', async () => {
      const classId = await createAssetClass();
      const id = await createMasterAsAdmin(classId);
      await request(app.getHttpServer())
        .patch(`/api/v1/asset-register/asset-masters/${id}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ action: 'deactivate', reason: 'Audit lattice closure' })
        .expect(200);

      const row = await expectAuditLog(db, {
        action: 'asset_register.asset_master.deactivate',
        resourceId: id,
        organizationId,
      });
      expect(row.resourceType).toBe('asset_register_asset_master');
      expect(row.metadata).toEqual({ reason: 'Audit lattice closure' });
    });

    it('returns 400 when name exceeds max length', async () => {
      const classId = await createAssetClass();
      await request(app.getHttpServer())
        .post('/api/v1/asset-register/asset-masters')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send(buildMasterCreatePayload(classId, { name: 'x'.repeat(256) }))
        .expect(400);
    });

    it('returns 400 when creating master for inactive asset class', async () => {
      const classId = await createAssetClass();
      await request(app.getHttpServer())
        .patch(`/api/v1/asset-register/asset-classes/${classId}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          action: 'deactivate',
          reason: 'Class inactive for master test',
        })
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/v1/asset-register/asset-masters')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send(buildMasterCreatePayload(classId))
        .expect(400);
    });

    it('returns 400 when PATCH master fields while asset class is inactive', async () => {
      const classId = await createAssetClass();
      const id = await createMasterAsAdmin(classId);
      await request(app.getHttpServer())
        .patch(`/api/v1/asset-register/asset-classes/${classId}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ action: 'deactivate', reason: 'Class off' })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/v1/asset-register/asset-masters/${id}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ name: 'Cannot edit when class inactive' })
        .expect(400);
    });

    it('allows deactivate on master when asset class is inactive', async () => {
      const classId = await createAssetClass();
      const id = await createMasterAsAdmin(classId);
      await request(app.getHttpServer())
        .patch(`/api/v1/asset-register/asset-classes/${classId}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          action: 'deactivate',
          reason: 'Class off but master deactivate ok',
        })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/v1/asset-register/asset-masters/${id}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          action: 'deactivate',
          reason: 'Master off while class inactive',
        })
        .expect(200);
    });

    it('joins class spec on detail and rejects class spec on create body', async () => {
      const classId = await createAssetClass({
        vehicleType: '2W',
        fuelType: 'Petrol',
      });
      const res = await request(app.getHttpServer())
        .post('/api/v1/asset-register/asset-masters')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send(
          buildMasterCreatePayload(classId, {
            vehicleType: '4W',
            fuelType: 'ShouldReject',
          }),
        )
        .expect(400);

      void res;
      const id = await createMasterAsAdmin(classId);
      const detail = await request(app.getHttpServer())
        .get(`/api/v1/asset-register/asset-masters/${id}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);
      const body = detail.body as AssetMasterDetail;
      expect(body.vehicleType).toBe('2W');
    });

    it('catalog lists only active masters for active class', async () => {
      const classId = await createAssetClass();
      const activeId = await createMasterAsAdmin(classId);
      const inactiveId = await createMasterAsAdmin(classId);
      await request(app.getHttpServer())
        .patch(`/api/v1/asset-register/asset-masters/${inactiveId}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ action: 'deactivate', reason: 'Hide from catalog' })
        .expect(200);

      const catalog = await request(app.getHttpServer())
        .get(`/api/v1/asset-register/asset-classes/${classId}/masters`)
        .query({ organizationId, page: 1, pageSize: 50 })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);
      const items = (catalog.body as { items: Array<{ id: string }> }).items;
      expect(items.some((row) => row.id === activeId)).toBe(true);
      expect(items.some((row) => row.id === inactiveId)).toBe(false);
    });

    it('returns 400 for catalog when asset class is inactive', async () => {
      const classId = await createAssetClass();
      await createMasterAsAdmin(classId);
      await request(app.getHttpServer())
        .patch(`/api/v1/asset-register/asset-classes/${classId}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ action: 'deactivate', reason: 'Catalog block' })
        .expect(200);

      await request(app.getHttpServer())
        .get(`/api/v1/asset-register/asset-classes/${classId}/masters`)
        .query({ organizationId, page: 1, pageSize: 50 })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(400);
    });

    it('filters list by assetClassId', async () => {
      const classA = await createAssetClass();
      const classB = await createAssetClass();
      const masterA = await createMasterAsAdmin(classA);
      await createMasterAsAdmin(classB);

      const list = await request(app.getHttpServer())
        .get('/api/v1/asset-register/asset-masters')
        .query({ organizationId, page: 1, pageSize: 50, assetClassId: classA })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);
      const items = (
        list.body as { items: Array<{ id: string; assetClassId: string }> }
      ).items;
      expect(items.some((row) => row.id === masterA)).toBe(true);
      expect(items.every((row) => row.assetClassId === classA)).toBe(true);
    });

    it('returns 403 on GET detail without asset_register.view', async () => {
      const classId = await createAssetClass();
      const id = await createMasterAsAdmin(classId);
      await request(app.getHttpServer())
        .get(`/api/v1/asset-register/asset-masters/${id}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${viewerToken}`)
        .set('x-organization-id', organizationId)
        .expect(403);
    });
  });
});
