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

const INVENTORY_VIEWER = {
  email: 'inventory.viewer@grubpac.local',
  password: 'ViewerTest123!',
  fullName: 'Inventory Viewer Only',
  roleName: 'Inventory Viewer Only',
  permissionKeys: ['administration.view'],
} as const;

describe('Inventory module (integration)', () => {
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
  let locationId: string;

  beforeAll(async () => {
    ctx = await bootstrapIntegrationAuth();
    ({ app, db, organizationId } = ctx);
    accessToken = ctx.adminAccessToken;

    await ensureUserWithPermissions(db, organizationId, INVENTORY_VIEWER);
    viewerToken = await loginAs(
      app,
      INVENTORY_VIEWER.email,
      INVENTORY_VIEWER.password,
    );

    const locRes = await request(app.getHttpServer())
      .get('/api/v1/organisation/locations')
      .query({ organizationId, page: 1, pageSize: 1 })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
    locationId = (locRes.body as { items: Array<{ id: string }> }).items[0]?.id;
  }, 90000);

  afterAll(async () => {
    await ctx?.close();
  });

  function buildPartPayload(overrides: Record<string, unknown> = {}) {
    const unique = Date.now();
    return {
      organizationId,
      name: `Integration Part ${unique}`,
      compatibleAssetClasses: ['Petrol Scooter — Standard'],
      unitOfMeasure: 'Each',
      retailMarkupPercent: 10,
      wholesaleMarkupPercent: 5,
      reorderThreshold: 5,
      ...overrides,
    };
  }

  async function createPartAsAdmin(): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/inventory/stock-register')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send(buildPartPayload())
      .expect(201);
    return (res.body as { id: string }).id;
  }

  describe('security lattice', () => {
    it('returns 401 without JWT on list and create', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/inventory/stock-register')
        .query({ organizationId })
        .expect(401);
      await request(app.getHttpServer())
        .post('/api/v1/inventory/stock-register')
        .set('x-organization-id', organizationId)
        .send(buildPartPayload())
        .expect(401);
    });

    it('returns 403 without inventory permission on list', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/inventory/stock-register')
        .query({ organizationId, page: 1, pageSize: 10 })
        .set('Authorization', `Bearer ${viewerToken}`)
        .set('x-organization-id', organizationId)
        .expect(403);
    });

    it('rejects unknown JSON keys on create', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/inventory/stock-register')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ ...buildPartPayload(), extraField: true })
        .expect(400);
    });
  });

  describe('stock register CRUD', () => {
    it('creates, lists, updates, and deactivates spare part', async () => {
      const partId = await createPartAsAdmin();

      await request(app.getHttpServer())
        .get(`/api/v1/inventory/stock-register/${partId}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/v1/inventory/stock-register/${partId}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ reorderThreshold: 12 })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/v1/inventory/stock-register/${partId}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ isActive: false, reason: 'Integration deactivate' })
        .expect(200);

      await expectAuditLog(db, {
        organizationId,
        action: 'inventory.spare_part.deactivate',
        resourceId: partId,
      });

      await request(app.getHttpServer())
        .patch(`/api/v1/inventory/stock-register/${partId}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ name: 'Should fail' })
        .expect(400);
    });
  });

  describe('stock receipts and balance', () => {
    it('creates receipt and reflects balance', async () => {
      if (!locationId) {
        expect(locationId).toBeDefined();
        return;
      }
      const partId = await createPartAsAdmin();

      const receiptRes = await request(app.getHttpServer())
        .post('/api/v1/inventory/stock-receipts')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          partId,
          locationId,
          purchaseDate: '2026-02-01',
          quantityReceived: 10,
          quantityUnitCostMinor: 50000,
          batchLotReference: 'LOT-INT-1',
        })
        .expect(201);

      const receiptId = (receiptRes.body as { id: string }).id;

      const balanceRes = await request(app.getHttpServer())
        .get(`/api/v1/inventory/stock-balance/${partId}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);

      expect((balanceRes.body as { onHand: number }).onHand).toBeGreaterThan(0);

      await request(app.getHttpServer())
        .patch(`/api/v1/inventory/stock-receipts/${receiptId}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ isActive: false, reason: 'Void receipt test' })
        .expect(200);
    });
  });

  describe('parts requests read', () => {
    it('lists parts requests', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/inventory/parts-requests')
        .query({ organizationId, page: 1, pageSize: 10 })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);
    });
  });
});
