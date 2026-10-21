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
  email: 'asset-classes.viewer@grubpac.local',
  password: 'ViewerTest123!',
  fullName: 'Asset Register Viewer Only',
  roleName: 'Asset Register Viewer Only',
  permissionKeys: ['administration.view'],
} as const;

const ASSET_VIEW_ONLY_USER = {
  email: 'asset.viewonly@grubpac.local',
  password: 'AssetViewOnly123!',
  fullName: 'Asset Register View Only',
  roleName: 'Asset Register View Only',
  permissionKeys: ['asset_register.view'],
} as const;

type AssetClassDetail = {
  id: string;
  name: string;
  isActive: boolean;
  status: string;
};

describe('Asset Register — asset classes (integration)', () => {
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

  function buildAssetClassCreatePayload(
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> {
    const unique = Date.now();
    return {
      organizationId,
      brand: 'Honda',
      modelName: `Lattice ${unique}`,
      manufacturingYear: 2026,
      engineDisplacementCc: 150,
      fuelSystem: 'efi',
      color: 'Black',
      colorCode: 'bl',
      vehicleType: '4W',
      fuelType: 'Diesel',
      mileageFrom: 40,
      mileageTo: 50,
      mileageUnit: 'km/L',
      fuelTankCapacity: 5.5,
      ratedLoadFrom: 150,
      ratedLoadTo: 250,
      intakeChecklistItems: ['Helmet'],
      ...overrides,
    };
  }

  async function createAssetClassAsAdmin(
    overrides: Record<string, unknown> = {},
  ): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/asset-register/asset-classes')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send(buildAssetClassCreatePayload(overrides))
      .expect(201);
    return (res.body as AssetClassDetail).id;
  }

  describe('security lattice — asset classes', () => {
    it('returns 401 without JWT on list and create', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/asset-register/asset-classes')
        .query({ organizationId })
        .expect(401);
      await request(app.getHttpServer())
        .post('/api/v1/asset-register/asset-classes')
        .set('x-organization-id', organizationId)
        .send(buildAssetClassCreatePayload())
        .expect(401);
    });

    it('returns 403 without asset_register permission on list', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/asset-register/asset-classes')
        .query({ organizationId, page: 1, pageSize: 10 })
        .set('Authorization', `Bearer ${viewerToken}`)
        .set('x-organization-id', organizationId)
        .expect(403);
    });

    it('allows asset_register.view list but returns 403 on create, patch, and status', async () => {
      const id = await createAssetClassAsAdmin();

      await request(app.getHttpServer())
        .get('/api/v1/asset-register/asset-classes')
        .query({ organizationId, page: 1, pageSize: 10 })
        .set('Authorization', `Bearer ${assetViewOnlyToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/v1/asset-register/asset-classes')
        .set('Authorization', `Bearer ${assetViewOnlyToken}`)
        .set('x-organization-id', organizationId)
        .send(buildAssetClassCreatePayload())
        .expect(403);

      await request(app.getHttpServer())
        .patch(`/api/v1/asset-register/asset-classes/${id}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${assetViewOnlyToken}`)
        .set('x-organization-id', organizationId)
        .send({ brand: 'View Only Cannot Rename' })
        .expect(403);

      await request(app.getHttpServer())
        .patch(`/api/v1/asset-register/asset-classes/${id}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${assetViewOnlyToken}`)
        .set('x-organization-id', organizationId)
        .send({ action: 'deactivate', reason: 'View only attempt' })
        .expect(403);
    });

    it('returns 403 when organisation context is missing on list', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/asset-register/asset-classes')
        .query({ page: 1, pageSize: 10 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);
    });

    it('returns 403 or 404 on PATCH with another organisation id (IDOR)', async () => {
      const id = await createAssetClassAsAdmin();
      const fakeOrgId = '00000000-0000-4000-8000-000000000099';
      await request(app.getHttpServer())
        .patch(`/api/v1/asset-register/asset-classes/${id}`)
        .query({ organizationId: fakeOrgId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', fakeOrgId)
        .send({ brand: 'Cross Org Rename' })
        .expect((res) => expect([403, 404]).toContain(res.status));
    });

    it('returns 403 or 404 on GET with another organisation id (IDOR)', async () => {
      const id = await createAssetClassAsAdmin();
      const fakeOrgId = '00000000-0000-4000-8000-000000000099';
      await request(app.getHttpServer())
        .get(`/api/v1/asset-register/asset-classes/${id}`)
        .query({ organizationId: fakeOrgId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', fakeOrgId)
        .expect((res) => expect([403, 404]).toContain(res.status));
    });

    it('returns 400 for unknown JSON key on create', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/asset-register/asset-classes')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send(buildAssetClassCreatePayload({ hackField: 'x' }))
        .expect(400);
    });

    it('returns 400 when client supplies deprecated code on create', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/asset-register/asset-classes')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send(buildAssetClassCreatePayload({ code: 'HACK' }))
        .expect(400);
    });

    it('returns 400 when client supplies name on create', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/asset-register/asset-classes')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send(buildAssetClassCreatePayload({ name: 'HACK' }))
        .expect(400);
    });

    it('returns 400 for invalid vehicleType on create', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/asset-register/asset-classes')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send(buildAssetClassCreatePayload({ vehicleType: '5W' }))
        .expect(400);
    });

    it('creates asset class with 4W vehicleType', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/asset-register/asset-classes')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send(
          buildAssetClassCreatePayload({
            vehicleType: '4W',
          }),
        )
        .expect(201);
      expect((res.body as { vehicleType: string }).vehicleType).toBe('4W');
    });

    it('returns 400 for unknown JSON key on PATCH', async () => {
      const id = await createAssetClassAsAdmin();
      await request(app.getHttpServer())
        .patch(`/api/v1/asset-register/asset-classes/${id}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ brand: 'Valid Brand', hackField: 'x' })
        .expect(400);
    });

    it('returns 403 when organisation context is missing on create', async () => {
      const { organizationId: _omit, ...bodyWithoutOrg } =
        buildAssetClassCreatePayload();
      void _omit;
      await request(app.getHttpServer())
        .post('/api/v1/asset-register/asset-classes')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(bodyWithoutOrg)
        .expect(403);
    });

    it('returns 400 when pageSize exceeds max', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/asset-register/asset-classes')
        .query({ organizationId, page: 1, pageSize: 51 })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(400);
    });

    it('returns 400 when PATCH on inactive asset class', async () => {
      const id = await createAssetClassAsAdmin();
      await request(app.getHttpServer())
        .patch(`/api/v1/asset-register/asset-classes/${id}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ action: 'deactivate', reason: 'For inactive edit test' })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/v1/asset-register/asset-classes/${id}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ brand: 'Cannot Edit Inactive' })
        .expect(400);
    });

    it('returns 400 when deactivating inactive asset class', async () => {
      const id = await createAssetClassAsAdmin();
      await request(app.getHttpServer())
        .patch(`/api/v1/asset-register/asset-classes/${id}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ action: 'deactivate', reason: 'First deactivate' })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/v1/asset-register/asset-classes/${id}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ action: 'deactivate', reason: 'Again' })
        .expect(400);
    });

    it('writes an audit row on deactivate', async () => {
      const id = await createAssetClassAsAdmin();
      await request(app.getHttpServer())
        .patch(`/api/v1/asset-register/asset-classes/${id}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ action: 'deactivate', reason: 'Audit lattice closure' })
        .expect(200);

      const row = await expectAuditLog(db, {
        action: 'asset_register.asset_class.deactivate',
        resourceId: id,
        organizationId,
      });
      expect(row.resourceType).toBe('asset_register_asset_class');
      expect(row.metadata).toEqual({ reason: 'Audit lattice closure' });
    });

    it('returns 400 when brand exceeds max length', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/asset-register/asset-classes')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send(buildAssetClassCreatePayload({ brand: 'x'.repeat(256) }))
        .expect(400);
    });

    it('creates with partial optional spec and placeholder name segments', async () => {
      const unique = Date.now();
      const res = await request(app.getHttpServer())
        .post('/api/v1/asset-register/asset-classes')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send(
          buildAssetClassCreatePayload({
            brand: undefined,
            modelName: undefined,
            manufacturingYear: undefined,
            engineDisplacementCc: undefined,
            fuelSystem: undefined,
            color: undefined,
            colorCode: undefined,
            modelName: `Partial Spec ${unique}`,
            fuelType: 'Petrol',
          }),
        )
        .expect(201);
      expect((res.body as AssetClassDetail).name).toMatch(
        /^0_partial-spec-\d+_0_petrol_na_na$/,
      );
    });

    it('generates meeting class name from spec fields on create', async () => {
      const unique = Date.now();
      const res = await request(app.getHttpServer())
        .post('/api/v1/asset-register/asset-classes')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send(
          buildAssetClassCreatePayload({
            brand: 'Honda',
            modelName: `Activa ${unique}`,
            manufacturingYear: 2026,
            engineDisplacementCc: 150,
            fuelType: 'Petrol',
            fuelSystem: 'efi',
            colorCode: 'bl',
          }),
        )
        .expect(201);
      expect((res.body as AssetClassDetail).name).toMatch(
        /^2026_activa-\d+_150_petrol_efi_bl$/,
      );
    });

    it('recomputes generated name when name-spec fields change on PATCH', async () => {
      const unique = Date.now();
      const id = await createAssetClassAsAdmin({
        modelName: `PatchName ${unique}`,
        manufacturingYear: 2024,
        engineDisplacementCc: 125,
        fuelType: 'Petrol',
        fuelSystem: 'carb',
        colorCode: 'rd',
      });
      const before = await request(app.getHttpServer())
        .get(`/api/v1/asset-register/asset-classes/${id}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);
      const beforeName = (before.body as AssetClassDetail).name;

      const patchRes = await request(app.getHttpServer())
        .patch(`/api/v1/asset-register/asset-classes/${id}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ manufacturingYear: 2026, engineDisplacementCc: 150 })
        .expect(200);
      const afterName = (patchRes.body as AssetClassDetail).name;
      expect(afterName).not.toBe(beforeName);
      expect(afterName).toMatch(/^2026_patchname-\d+_150_petrol_carb_rd$/);

      await request(app.getHttpServer())
        .patch(`/api/v1/asset-register/asset-classes/${id}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ brand: 'Only brand label change' })
        .expect(200);
    });

    it('list item id is full UUID and matches detail GET', async () => {
      const id = await createAssetClassAsAdmin();

      const listRes = await request(app.getHttpServer())
        .get('/api/v1/asset-register/asset-classes')
        .query({ organizationId, page: 1, pageSize: 50 })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);

      const listBody = listRes.body as {
        items: Array<{ id: string; name: string }>;
      };
      const listRow = listBody.items.find((row) => row.id === id);
      expect(listRow).toBeDefined();
      expect(listRow!.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(listRow!.id.length).toBe(36);

      const detailRes = await request(app.getHttpServer())
        .get(`/api/v1/asset-register/asset-classes/${id}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);

      expect((detailRes.body as AssetClassDetail).id).toBe(listRow!.id);
    });

    it('lists only inactive classes when status=inactive', async () => {
      const id = await createAssetClassAsAdmin();
      await request(app.getHttpServer())
        .patch(`/api/v1/asset-register/asset-classes/${id}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ action: 'deactivate', reason: 'Inactive filter test' })
        .expect(200);

      const inactiveRes = await request(app.getHttpServer())
        .get('/api/v1/asset-register/asset-classes')
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
    });

    it('returns 403 on GET detail without asset_register.view', async () => {
      const id = await createAssetClassAsAdmin();
      await request(app.getHttpServer())
        .get(`/api/v1/asset-register/asset-classes/${id}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${viewerToken}`)
        .set('x-organization-id', organizationId)
        .expect(403);
    });

    it('returns global intake catalog with org context and asset_register.view', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/asset-register/catalog/intake-checklist-items')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);

      const res = await request(app.getHttpServer())
        .get('/api/v1/asset-register/catalog/intake-checklist-items')
        .set('Authorization', `Bearer ${assetViewOnlyToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);

      const body = res.body as { items: string[] };
      expect(Array.isArray(body.items)).toBe(true);
      expect(body.items.length).toBeGreaterThan(0);
      expect(body.items).toContain('Registration documents verified');
    });

    it('returns intakeChecklistItems on GET detail after create', async () => {
      const id = await createAssetClassAsAdmin({
        intakeChecklistItems: ['Helmet', 'Insurance policy copy'],
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/asset-register/asset-classes/${id}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);

      const body = res.body as { intakeChecklistItems: string[] };
      expect(body.intakeChecklistItems).toEqual([
        'Helmet',
        'Insurance policy copy',
      ]);
    });
  });
});
