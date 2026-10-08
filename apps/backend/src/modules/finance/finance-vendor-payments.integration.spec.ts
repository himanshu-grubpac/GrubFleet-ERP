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
  email: 'finance.vp.viewonly@grubpac.local',
  password: 'FinanceVpView123!',
  fullName: 'Finance VP View Only',
  roleName: 'Finance VP View Only',
  permissionKeys: ['finance.view'],
} as const;

const NO_FINANCE_USER = {
  email: 'finance.vp.denied@grubpac.local',
  password: 'FinanceVpDenied123!',
  fullName: 'Finance VP Denied',
  roleName: 'Finance VP Denied',
  permissionKeys: ['organisation.view'],
} as const;

describe('Finance vendor payments (integration)', () => {
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
  let financeViewToken: string;
  let deniedToken: string;
  let supplierId: string;
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
        name: `VP Vendor ${unique}`,
        supplierType: 'spare_parts',
        contactPerson: 'VP Contact',
        contactPhone: '+919888877772',
        contactEmail: `vp.vendor.${unique}@grubpac.local`,
        agreementReference: `VP-${unique}`,
        addressLine1: 'Line 1',
        addressCountry: 'IN',
        addressState: 'Maharashtra',
        addressDistrict: 'Mumbai',
        addressPincode: '400001',
      })
      .expect(201);
    supplierId = (supplierRes.body as { id: string }).id;

    assetClassName = `VP Class ${unique}`;
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
      .expect(201);
  });

  async function createPurchaseInvoice(totalAmountMinor: number) {
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/finance/invoices/purchase/vehicle')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        supplierId,
        assetClassName,
        totalAmountMinor,
        invoiceDate: '2026-06-01',
      })
      .expect(201);
    return createRes.body as { id: string; invoiceNumber: string };
  }

  describe('security lattice', () => {
    it('401 without token on list', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/finance/vendor-payments')
        .query({ organizationId })
        .expect(401);
    });

    it('403 without finance.view on list', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/finance/vendor-payments')
        .query({ organizationId })
        .set('Authorization', `Bearer ${deniedToken}`)
        .set('x-organization-id', organizationId)
        .expect(403);
    });

    it('403 view-only cannot record payment', async () => {
      const inv = await createPurchaseInvoice(10_000);
      await request(app.getHttpServer())
        .post('/api/v1/finance/vendor-payments')
        .set('Authorization', `Bearer ${financeViewToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          purchaseInvoiceId: inv.id,
          amountMinor: 1000,
          paymentDate: '2026-06-02',
          paymentMethod: 'bank_transfer',
        })
        .expect(403);
    });

    it('400 unknown field on create', async () => {
      const inv = await createPurchaseInvoice(5000);
      await request(app.getHttpServer())
        .post('/api/v1/finance/vendor-payments')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          purchaseInvoiceId: inv.id,
          amountMinor: 1000,
          paymentDate: '2026-06-02',
          paymentMethod: 'bank_transfer',
          extraField: true,
        })
        .expect(400);
    });
  });

  describe('record, list, remove LIFO', () => {
    it('records payment, updates invoice, blocks invoice POST payments', async () => {
      const inv = await createPurchaseInvoice(20_000);

      const recordRes = await request(app.getHttpServer())
        .post('/api/v1/finance/vendor-payments')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          purchaseInvoiceId: inv.id,
          amountMinor: 8000,
          paymentDate: '2026-06-03',
          paymentMethod: 'upi',
          paymentReference: 'UTR-VP-1',
        })
        .expect(201);

      const payment = recordRes.body as {
        id: string;
        paymentNumber: string;
        amountMinor: number;
        availableActions: { remove: boolean };
      };
      expect(payment.paymentNumber).toMatch(/^VPAY-2026-\d{4}$/);
      expect(payment.amountMinor).toBe(8000);
      expect(payment.availableActions.remove).toBe(true);

      await expectAuditLog(db, {
        organizationId,
        action: 'finance.vendor_payment.create',
        resourceId: payment.id,
      });

      const detailRes = await request(app.getHttpServer())
        .get(`/api/v1/finance/invoices/${inv.id}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);

      const detail = detailRes.body as {
        status: string;
        amountPaidMinor: number;
        payments: Array<{ paymentNumber: string | null }>;
      };
      expect(detail.status).toBe('partially_paid');
      expect(detail.amountPaidMinor).toBe(8000);
      expect(detail.payments[0]?.paymentNumber).toMatch(/^VPAY-/);

      await request(app.getHttpServer())
        .post(`/api/v1/finance/invoices/${inv.id}/payments`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          amountMinor: 100,
          paymentDate: '2026-06-04',
          paymentMethod: 'cash',
        })
        .expect(400);
    });

    it('400 when removing non-latest payment', async () => {
      const inv = await createPurchaseInvoice(30_000);

      const first = await request(app.getHttpServer())
        .post('/api/v1/finance/vendor-payments')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          purchaseInvoiceId: inv.id,
          amountMinor: 10_000,
          paymentDate: '2026-06-05',
          paymentMethod: 'bank_transfer',
        })
        .expect(201);

      const second = await request(app.getHttpServer())
        .post('/api/v1/finance/vendor-payments')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          purchaseInvoiceId: inv.id,
          amountMinor: 5000,
          paymentDate: '2026-06-06',
          paymentMethod: 'cheque',
        })
        .expect(201);

      const firstId = (first.body as { id: string }).id;
      const secondId = (second.body as { id: string }).id;

      await request(app.getHttpServer())
        .delete(`/api/v1/finance/vendor-payments/${firstId}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(400);

      await request(app.getHttpServer())
        .delete(`/api/v1/finance/vendor-payments/${secondId}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);

      await expectAuditLog(db, {
        organizationId,
        action: 'finance.vendor_payment.remove',
        resourceId: secondId,
      });

      const detailRes = await request(app.getHttpServer())
        .get(`/api/v1/finance/invoices/${inv.id}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);

      const detail = detailRes.body as {
        amountPaidMinor: number;
        status: string;
      };
      expect(detail.amountPaidMinor).toBe(10_000);
      expect(detail.status).toBe('partially_paid');
    });

    it('lists with search and catalog excludes paid invoices', async () => {
      const inv = await createPurchaseInvoice(5000);

      const listBefore = await request(app.getHttpServer())
        .get('/api/v1/finance/vendor-payments/purchase-invoices/catalog')
        .query({
          organizationId,
          pageSize: 50,
          search: inv.invoiceNumber,
        })
        .set('Authorization', `Bearer ${financeViewToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);

      const catalog = listBefore.body as { items: Array<{ id: string }> };
      expect(catalog.items.some((i) => i.id === inv.id)).toBe(true);

      await request(app.getHttpServer())
        .post('/api/v1/finance/vendor-payments')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          purchaseInvoiceId: inv.id,
          amountMinor: 5000,
          paymentDate: '2026-06-07',
          paymentMethod: 'cash',
        })
        .expect(201);

      const catalogAfter = await request(app.getHttpServer())
        .get('/api/v1/finance/vendor-payments/purchase-invoices/catalog')
        .query({
          organizationId,
          pageSize: 50,
          search: inv.invoiceNumber,
        })
        .set('Authorization', `Bearer ${financeViewToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);

      const afterItems = (catalogAfter.body as { items: Array<{ id: string }> })
        .items;
      expect(afterItems.some((i) => i.id === inv.id)).toBe(false);

      const listRes = await request(app.getHttpServer())
        .get('/api/v1/finance/vendor-payments')
        .query({ organizationId, search: 'VPAY' })
        .set('Authorization', `Bearer ${financeViewToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);

      const list = listRes.body as { items: unknown[]; total: number };
      expect(list.total).toBeGreaterThan(0);
    });
  });
});
