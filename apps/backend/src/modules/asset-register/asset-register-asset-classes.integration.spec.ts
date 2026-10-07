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
  code: string;
  isActive: boolean;
  status: string;
};

describe('Asset Register — asset classes (integration)', () => {
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
      name: `Lattice Class ${unique}`,
      vehicleType: '4W',
      fuelType: 'Diesel',
      fuelTankCapacity: 60,
      ratedLoadFrom: 500,
      ratedLoadTo: 1500,
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
        .send({ name: 'View Only Cannot Rename' })
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
        .send({ name: 'Cross Org Rename' })
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

    it('returns 400 when client supplies code on create', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/asset-register/asset-classes')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send(buildAssetClassCreatePayload({ code: 'HACK' }))
        .expect(400);
    });

    it('returns 400 for unknown JSON key on PATCH', async () => {
      const id = await createAssetClassAsAdmin();
      await request(app.getHttpServer())
        .patch(`/api/v1/asset-register/asset-classes/${id}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ name: 'Valid Name', hackField: 'x' })
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
        .send({ name: 'Cannot Edit Inactive' })
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

    it('returns 400 when name exceeds max length', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/asset-register/asset-classes')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send(buildAssetClassCreatePayload({ name: 'x'.repeat(256) }))
        .expect(400);
    });

    it('generates class code from name initials on create', async () => {
      const unique = Date.now();
      const res = await request(app.getHttpServer())
        .post('/api/v1/asset-register/asset-classes')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send(
          buildAssetClassCreatePayload({
            name: `Pickup Small Heavy Duty ${unique}`,
          }),
        )
        .expect(201);
      expect((res.body as AssetClassDetail).code).toMatch(/^PSHD(-\d+)?$/);
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
  });
});
