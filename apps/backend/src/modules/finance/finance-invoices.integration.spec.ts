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

const FINANCE_VIEW_ONLY_USER = {
  email: 'finance.viewonly@grubpac.local',
  password: 'FinanceView123!',
  fullName: 'Finance View Only',
  roleName: 'Finance View Only',
  permissionKeys: ['finance.view'],
} as const;

const NO_FINANCE_USER = {
  email: 'finance.denied@grubpac.local',
  password: 'FinanceDenied123!',
  fullName: 'Finance Denied',
  roleName: 'Finance Denied',
  permissionKeys: ['organisation.view'],
} as const;

describe('Finance invoices (integration)', () => {
  if (process.env.SKIP_DB_INTEGRATION === '1') {
    it.todo('skipped when SKIP_DB_INTEGRATION=1');
    return;
  }

  let ctx: IntegrationAuthContext;
  let app: INestApplication<App>;
  let db: AppDatabase;
  let organizationId: string;
  let accessToken: string;
  let financeViewToken: string;
  let deniedToken: string;
  let supplierId: string;
  let partId: string;
  let assetClassName: string;

  beforeAll(async () => {
    ctx = await bootstrapIntegrationAuth();
    ({ app, db, organizationId } = ctx);
    accessToken = ctx.adminAccessToken;

    await ensureUserWithPermissions(db, organizationId, FINANCE_VIEW_ONLY_USER);
    await ensureUserWithPermissions(db, organizationId, NO_FINANCE_USER);
    financeViewToken = await loginAs(
      app,
      FINANCE_VIEW_ONLY_USER.email,
      FINANCE_VIEW_ONLY_USER.password,
    );
    deniedToken = await loginAs(
      app,
      NO_FINANCE_USER.email,
      NO_FINANCE_USER.password,
    );

    const unique = Date.now();
    const supplierRes = await request(app.getHttpServer())
      .post('/api/v1/organisation/suppliers')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        name: `Finance Vendor ${unique}`,
        supplierType: 'spare_parts',
        contactPerson: 'Finance Contact',
        contactPhone: '+919888877771',
        contactEmail: `finance.vendor.${unique}@grubpac.local`,
        agreementReference: `FIN-${unique}`,
        addressLine1: 'Line 1',
        addressCountry: 'IN',
        addressState: 'Maharashtra',
        addressDistrict: 'Mumbai',
        addressPincode: '400001',
      })
      .expect(201);
    supplierId = (supplierRes.body as { id: string }).id;

    assetClassName = `Finance Class ${unique}`;
    await request(app.getHttpServer())
      .post('/api/v1/asset-register/asset-classes')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        name: assetClassName,
        vehicleType: '2W',
        fuelType: 'Petrol',
        fuelTankCapacity: 10,
        ratedLoadFrom: 100,
        ratedLoadTo: 200,
      })
      .expect((res) => expect([200, 201]).toContain(res.status));

    const partRes = await request(app.getHttpServer())
      .post('/api/v1/finance/inventory-parts')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        name: `Brake Pad ${unique}`,
        partCode: `BP-${unique}`,
      })
      .expect(201);
    partId = (partRes.body as { id: string }).id;
  }, 120000);

  afterAll(async () => {
    await ctx?.close();
  });

  describe('security lattice — invoices', () => {
    it('returns 401 without JWT on list and create', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/finance/invoices')
        .query({ organizationId })
        .expect(401);
      await request(app.getHttpServer())
        .post('/api/v1/finance/invoices/purchase/vehicle')
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          supplierId,
          assetClassName,
          totalAmountMinor: 10000,
          invoiceDate: '2026-04-01',
        })
        .expect(401);
    });

    it('returns 403 without finance permission on list', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/finance/invoices')
        .query({ organizationId, page: 1, pageSize: 10 })
        .set('Authorization', `Bearer ${deniedToken}`)
        .set('x-organization-id', organizationId)
        .expect(403);
    });

    it('allows finance.view on list but 403 on create and cancel', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/finance/invoices')
        .query({ organizationId, page: 1, pageSize: 10 })
        .set('Authorization', `Bearer ${financeViewToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/v1/finance/invoices/purchase/vehicle')
        .set('Authorization', `Bearer ${financeViewToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          supplierId,
          assetClassName,
          totalAmountMinor: 10000,
          invoiceDate: '2026-04-01',
        })
        .expect(403);
    });

    it('returns 403 without organization context', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/finance/invoices')
        .query({ page: 1, pageSize: 10 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);
    });

    it('returns 400 on unknown JSON keys on create', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/finance/invoices/purchase/vehicle')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          supplierId,
          assetClassName,
          totalAmountMinor: 10000,
          invoiceDate: '2026-04-01',
          unexpected: true,
        })
        .expect(400);
    });
  });

  describe('purchase invoices — happy path', () => {
    it('creates vehicle purchase invoice with PINV number and audit', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/finance/invoices/purchase/vehicle')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          supplierId,
          assetClassName,
          totalAmountMinor: 2500000,
          invoiceDate: '2026-04-15',
          notes: 'Integration vehicle purchase',
        })
        .expect(201);

      const body = res.body as {
        invoiceNumber: string;
        invoiceType: string;
        status: string;
        partyName: string;
        totalAmountMinor: number;
      };
      expect(body.invoiceNumber).toMatch(/^PINV-2026-\d{4}$/);
      expect(body.invoiceType).toBe('purchase');
      expect(body.status).toBe('unpaid');
      expect(body.partyName).toContain('Finance Vendor');
      expect(body.totalAmountMinor).toBe(2500000);

      await expectAuditLog(db, {
        organizationId,
        action: 'finance.invoice.create',
        resourceId: (res.body as { id: string }).id,
      });
    });

    it('creates spare parts purchase invoice', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/finance/invoices/purchase/spare-parts')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          supplierId,
          inventoryPartId: partId,
          quantity: 4,
          unitCostMinor: 50000,
          invoiceDate: '2026-04-16',
          batchLot: 'LOT-1',
        })
        .expect(201);

      const body = res.body as { totalAmountMinor: number; lines: unknown[] };
      expect(body.totalAmountMinor).toBe(200000);
      expect(body.lines.length).toBe(1);
    });

    it('lists with type filter and search', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/finance/invoices')
        .query({
          organizationId,
          page: 1,
          pageSize: 10,
          invoiceType: 'purchase',
          search: 'PINV',
        })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);

      const body = res.body as { items: unknown[]; total: number };
      expect(body.total).toBeGreaterThan(0);
      expect(Array.isArray(body.items)).toBe(true);
    });

    it('returns 400 when recording payment on purchase invoice', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/finance/invoices/purchase/vehicle')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          supplierId,
          assetClassName,
          totalAmountMinor: 10000,
          invoiceDate: '2026-06-01',
        })
        .expect(201);
      const id = (createRes.body as { id: string }).id;

      await request(app.getHttpServer())
        .post(`/api/v1/finance/invoices/${id}/payments`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          amountMinor: 4000,
          paymentDate: '2026-06-02',
          paymentMethod: 'bank_transfer',
        })
        .expect(400);
    });

    it('returns 403 on record payment for finance.view only', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/finance/invoices/purchase/vehicle')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          supplierId,
          assetClassName,
          totalAmountMinor: 500,
          invoiceDate: '2026-06-03',
        })
        .expect(201);
      const id = (createRes.body as { id: string }).id;

      await request(app.getHttpServer())
        .post(`/api/v1/finance/invoices/${id}/payments`)
        .set('Authorization', `Bearer ${financeViewToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          amountMinor: 100,
          paymentDate: '2026-06-03',
        })
        .expect(403);
    });

    it('removes unpaid purchase invoice with audit (hard delete)', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/finance/invoices/purchase/vehicle')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          supplierId,
          assetClassName,
          totalAmountMinor: 100,
          invoiceDate: '2026-05-01',
        })
        .expect(201);
      const id = (createRes.body as { id: string }).id;

      const removeRes = await request(app.getHttpServer())
        .delete(`/api/v1/finance/invoices/${id}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);

      expect((removeRes.body as { removed: boolean }).removed).toBe(true);

      await request(app.getHttpServer())
        .get(`/api/v1/finance/invoices/${id}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(404);

      await expectAuditLog(db, {
        organizationId,
        action: 'finance.invoice.remove',
        resourceType: 'finance_invoice',
        resourceId: id,
      });
    });

    it('returns 400 when PATCH cancel on purchase invoice', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/finance/invoices/purchase/vehicle')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          supplierId,
          assetClassName,
          totalAmountMinor: 100,
          invoiceDate: '2026-05-02',
        })
        .expect(201);
      const id = (createRes.body as { id: string }).id;

      await request(app.getHttpServer())
        .patch(`/api/v1/finance/invoices/${id}/cancel`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ organizationId })
        .expect(400);
    });

    it('detail exposes purchase payment read-only summary and no recordPayment action', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/finance/invoices/purchase/vehicle')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          supplierId,
          assetClassName,
          totalAmountMinor: 5000,
          invoiceDate: '2026-05-03',
        })
        .expect(201);
      const id = (createRes.body as { id: string }).id;

      const detailRes = await request(app.getHttpServer())
        .get(`/api/v1/finance/invoices/${id}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);

      const body = detailRes.body as {
        paymentSummary: { readOnly: boolean; readOnlyMessage: string | null };
        availableActions: {
          recordPayment: boolean;
          remove: boolean;
          cancel: boolean;
        };
      };
      expect(body.paymentSummary.readOnly).toBe(true);
      expect(body.paymentSummary.readOnlyMessage).toContain('Vendor Payments');
      expect(body.availableActions.recordPayment).toBe(false);
      expect(body.availableActions.remove).toBe(true);
      expect(body.availableActions.cancel).toBe(false);
    });
  });

  describe('payment method catalog', () => {
    it('returns payment methods for finance.view', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/finance/invoices/payment-methods/catalog')
        .query({ organizationId })
        .set('Authorization', `Bearer ${financeViewToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);

      const body = res.body as Array<{ value: string; label: string }>;
      expect(body.length).toBeGreaterThan(0);
      expect(body.some((m) => m.value === 'bank_transfer')).toBe(true);
    });
  });
});
