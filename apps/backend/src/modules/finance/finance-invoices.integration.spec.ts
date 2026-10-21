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
import { computePurchaseVehicleLineTax } from './utils/purchase-vehicle-line-tax.util';

type VehiclePurchaseLineInput = {
  assetClassId: string;
  quantity: number;
  rateMinor: number;
  taxMode: 'INCLUSIVE' | 'EXCLUSIVE';
  vatPercent: number;
};

function sumVehiclePurchaseGrandTotal(
  lines: VehiclePurchaseLineInput[],
): number {
  return lines.reduce((sum, line) => {
    const breakdown = computePurchaseVehicleLineTax(
      line.quantity,
      line.rateMinor,
      line.taxMode,
      line.vatPercent,
    );
    return sum + breakdown.lineTotalMinor;
  }, 0);
}

function buildVehiclePurchasePayload(params: {
  organizationId: string;
  supplierId: string;
  invoiceDate: string;
  lines: VehiclePurchaseLineInput[];
  grandTotalMinor?: number;
  unexpected?: boolean;
}) {
  const { unexpected, ...rest } = params;
  const body = {
    organizationId: rest.organizationId,
    supplierId: rest.supplierId,
    invoiceDate: rest.invoiceDate,
    lines: rest.lines,
    grandTotalMinor:
      rest.grandTotalMinor ?? sumVehiclePurchaseGrandTotal(rest.lines),
  };
  if (unexpected) {
    return { ...body, unexpected: true };
  }
  return body;
}

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
  let partId: string;
  let assetClassId: string;
  let assetClassId2: string;

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

    const modelName = `Finance Class ${unique}`;
    const classRes = await request(app.getHttpServer())
      .post('/api/v1/asset-register/asset-classes')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        modelName,
        vehicleType: '2W',
        fuelType: 'Petrol',
        mileageFrom: 40,
        mileageTo: 55,
        mileageUnit: 'km/L',
        fuelTankCapacity: 10,
        ratedLoadFrom: 100,
        ratedLoadTo: 200,
        intakeChecklistItems: ['Helmet'],
      })
      .expect((res) => expect([200, 201]).toContain(res.status));
    assetClassId = (classRes.body as { id: string }).id;

    const classRes2 = await request(app.getHttpServer())
      .post('/api/v1/asset-register/asset-classes')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        modelName: `Finance Class B ${unique}`,
        vehicleType: '2W',
        fuelType: 'Petrol',
        mileageFrom: 40,
        mileageTo: 55,
        mileageUnit: 'km/L',
        fuelTankCapacity: 10,
        ratedLoadFrom: 100,
        ratedLoadTo: 200,
        intakeChecklistItems: ['Helmet'],
      })
      .expect((res) => expect([200, 201]).toContain(res.status));
    assetClassId2 = (classRes2.body as { id: string }).id;

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
        .send(
          buildVehiclePurchasePayload({
            organizationId,
            supplierId,
            invoiceDate: '2026-04-01',
            lines: [
              {
                assetClassId,
                quantity: 1,
                rateMinor: 10_000,
                taxMode: 'INCLUSIVE',
                vatPercent: 18,
              },
            ],
          }),
        )
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
        .send(
          buildVehiclePurchasePayload({
            organizationId,
            supplierId,
            invoiceDate: '2026-04-01',
            lines: [
              {
                assetClassId,
                quantity: 1,
                rateMinor: 10_000,
                taxMode: 'INCLUSIVE',
                vatPercent: 18,
              },
            ],
          }),
        )
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
        .send(
          buildVehiclePurchasePayload({
            organizationId,
            supplierId,
            invoiceDate: '2026-04-01',
            lines: [
              {
                assetClassId,
                quantity: 1,
                rateMinor: 10_000,
                taxMode: 'INCLUSIVE',
                vatPercent: 18,
              },
            ],
            unexpected: true,
          }),
        )
        .expect(400);
    });

    it('returns 400 for invalid invoiceDate on purchase vehicle create', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/finance/invoices/purchase/vehicle')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send(
          buildVehiclePurchasePayload({
            organizationId,
            supplierId,
            invoiceDate: 'not-a-date',
            lines: [
              {
                assetClassId,
                quantity: 1,
                rateMinor: 10_000,
                taxMode: 'INCLUSIVE',
                vatPercent: 18,
              },
            ],
          }),
        )
        .expect(400);
    });
  });

  describe('purchase invoices — happy path', () => {
    it('creates vehicle purchase invoice with PINV number and audit', async () => {
      const lines = [
        {
          assetClassId,
          quantity: 1,
          rateMinor: 2_500_000,
          taxMode: 'INCLUSIVE' as const,
          vatPercent: 18,
        },
      ];
      const res = await request(app.getHttpServer())
        .post('/api/v1/finance/invoices/purchase/vehicle')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send(
          buildVehiclePurchasePayload({
            organizationId,
            supplierId,
            invoiceDate: '2026-04-15',
            lines,
          }),
        )
        .expect(201);

      const body = res.body as {
        invoiceNumber: string;
        invoiceType: string;
        status: string;
        partyName: string;
        totalAmountMinor: number;
        lines: Array<{
          assetClassId: string;
          taxMode: string;
          baseAmountMinor: number;
          taxAmountMinor: number;
          lineAmountMinor: number;
        }>;
      };
      expect(body.invoiceNumber).toMatch(/^PINV-2026-\d{4}$/);
      expect(body.invoiceType).toBe('purchase');
      expect(body.status).toBe('unpaid');
      expect(body.partyName).toContain('Finance Vendor');
      expect(body.totalAmountMinor).toBe(2_500_000);
      expect(body.lines).toHaveLength(1);
      expect(body.lines[0]?.assetClassId).toBe(assetClassId);
      expect(body.lines[0]?.taxMode).toBe('INCLUSIVE');
      expect(body.lines[0]?.lineAmountMinor).toBe(2_500_000);

      await expectAuditLog(db, {
        organizationId,
        action: 'finance.invoice.create',
        resourceId: (res.body as { id: string }).id,
      });
    });

    it('creates EXCLUSIVE tax line with computed line total', async () => {
      const lines = [
        {
          assetClassId,
          quantity: 1,
          rateMinor: 5_000_000,
          taxMode: 'EXCLUSIVE' as const,
          vatPercent: 18,
        },
      ];
      const res = await request(app.getHttpServer())
        .post('/api/v1/finance/invoices/purchase/vehicle')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send(
          buildVehiclePurchasePayload({
            organizationId,
            supplierId,
            invoiceDate: '2026-04-16',
            lines,
          }),
        )
        .expect(201);

      const body = res.body as {
        totalAmountMinor: number;
        lines: Array<{ lineAmountMinor: number; taxAmountMinor: number }>;
      };
      expect(body.totalAmountMinor).toBe(5_900_000);
      expect(body.lines[0]?.lineAmountMinor).toBe(5_900_000);
      expect(body.lines[0]?.taxAmountMinor).toBe(900_000);
    });

    it('creates multi-line vehicle purchase with grand total sum', async () => {
      const lines = [
        {
          assetClassId,
          quantity: 20,
          rateMinor: 50_000,
          taxMode: 'INCLUSIVE' as const,
          vatPercent: 18,
        },
        {
          assetClassId: assetClassId2,
          quantity: 30,
          rateMinor: 60_000,
          taxMode: 'EXCLUSIVE' as const,
          vatPercent: 18,
        },
      ];
      const grandTotalMinor = sumVehiclePurchaseGrandTotal(lines);
      const res = await request(app.getHttpServer())
        .post('/api/v1/finance/invoices/purchase/vehicle')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send(
          buildVehiclePurchasePayload({
            organizationId,
            supplierId,
            invoiceDate: '2026-04-17',
            lines,
            grandTotalMinor,
          }),
        )
        .expect(201);

      const body = res.body as { totalAmountMinor: number; lines: unknown[] };
      expect(body.lines).toHaveLength(2);
      expect(body.totalAmountMinor).toBe(grandTotalMinor);
    });

    it('returns 400 when grand total does not match line totals', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/finance/invoices/purchase/vehicle')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send(
          buildVehiclePurchasePayload({
            organizationId,
            supplierId,
            invoiceDate: '2026-04-18',
            lines: [
              {
                assetClassId,
                quantity: 1,
                rateMinor: 100_000,
                taxMode: 'INCLUSIVE',
                vatPercent: 18,
              },
            ],
            grandTotalMinor: 1,
          }),
        )
        .expect(400);
    });

    it('returns 400 for unknown asset class id', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/finance/invoices/purchase/vehicle')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send(
          buildVehiclePurchasePayload({
            organizationId,
            supplierId,
            invoiceDate: '2026-04-19',
            lines: [
              {
                assetClassId: '00000000-0000-4000-8000-000000000099',
                quantity: 1,
                rateMinor: 100_000,
                taxMode: 'INCLUSIVE',
                vatPercent: 18,
              },
            ],
          }),
        )
        .expect(400);
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
        .send(
          buildVehiclePurchasePayload({
            organizationId,
            supplierId,
            invoiceDate: '2026-06-01',
            lines: [
              {
                assetClassId,
                quantity: 1,
                rateMinor: 10_000,
                taxMode: 'INCLUSIVE',
                vatPercent: 18,
              },
            ],
          }),
        )
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
        .send(
          buildVehiclePurchasePayload({
            organizationId,
            supplierId,
            invoiceDate: '2026-06-03',
            lines: [
              {
                assetClassId,
                quantity: 1,
                rateMinor: 500,
                taxMode: 'INCLUSIVE',
                vatPercent: 18,
              },
            ],
          }),
        )
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
        .send(
          buildVehiclePurchasePayload({
            organizationId,
            supplierId,
            invoiceDate: '2026-05-01',
            lines: [
              {
                assetClassId,
                quantity: 1,
                rateMinor: 100,
                taxMode: 'INCLUSIVE',
                vatPercent: 18,
              },
            ],
          }),
        )
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
        .send(
          buildVehiclePurchasePayload({
            organizationId,
            supplierId,
            invoiceDate: '2026-05-02',
            lines: [
              {
                assetClassId,
                quantity: 1,
                rateMinor: 100,
                taxMode: 'INCLUSIVE',
                vatPercent: 18,
              },
            ],
          }),
        )
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
        .send(
          buildVehiclePurchasePayload({
            organizationId,
            supplierId,
            invoiceDate: '2026-05-03',
            lines: [
              {
                assetClassId,
                quantity: 1,
                rateMinor: 5_000,
                taxMode: 'INCLUSIVE',
                vatPercent: 18,
              },
            ],
          }),
        )
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

  describe('inventory parts catalog (purchase spare tab)', () => {
    it('returns parts for finance.view with valid pageSize', async () => {
      let page = 1;
      const pageSize = 50;
      let found = false;
      while (!found) {
        const res = await request(app.getHttpServer())
          .get('/api/v1/finance/inventory-parts')
          .query({ organizationId, page, pageSize })
          .set('Authorization', `Bearer ${financeViewToken}`)
          .set('x-organization-id', organizationId)
          .expect(200);

        const body = res.body as {
          items: Array<{ id: string }>;
          totalPages: number;
        };
        if (body.items.some((row) => row.id === partId)) {
          found = true;
          break;
        }
        if (page >= body.totalPages) {
          break;
        }
        page += 1;
      }
      expect(found).toBe(true);
    });

    it('returns 400 when pageSize exceeds max', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/finance/inventory-parts')
        .query({ organizationId, page: 1, pageSize: 100 })
        .set('Authorization', `Bearer ${financeViewToken}`)
        .set('x-organization-id', organizationId)
        .expect(400);
    });
  });

  describe('purchase asset class catalog', () => {
    it('returns active asset classes for finance.view without asset-register.view', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/asset-register/asset-classes')
        .query({ organizationId, page: 1, pageSize: 50 })
        .set('Authorization', `Bearer ${financeViewToken}`)
        .set('x-organization-id', organizationId)
        .expect(403);

      const res = await request(app.getHttpServer())
        .get('/api/v1/finance/invoices/asset-classes/catalog')
        .query({ organizationId, page: 1, pageSize: 50, status: 'active' })
        .set('Authorization', `Bearer ${financeViewToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);

      const body = res.body as {
        items: Array<{ id: string; name: string }>;
      };
      expect(body.items.some((row) => row.id === assetClassId)).toBe(true);
    });

    it('returns 403 without finance.view', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/finance/invoices/asset-classes/catalog')
        .query({ organizationId, page: 1, pageSize: 50 })
        .set('Authorization', `Bearer ${deniedToken}`)
        .set('x-organization-id', organizationId)
        .expect(403);
    });
  });

  describe('sale and billing invoices — boundary', () => {
    const fakeUuid = '00000000-0000-4000-8000-000000000001';

    it('returns 403 on sale create for finance.view only', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/finance/invoices/sale')
        .set('Authorization', `Bearer ${financeViewToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          vehicleId: fakeUuid,
          buyerName: 'Buyer',
          totalAmountMinor: 100_00,
          invoiceDate: '2026-04-01',
        })
        .expect(403);
    });

    it('returns 403 on billing create for finance.view only', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/finance/invoices/billing/lease')
        .set('Authorization', `Bearer ${financeViewToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          clientId: fakeUuid,
          leaseContractId: fakeUuid,
          billingPeriod: 'April 2026',
          totalAmountMinor: 50_000_00,
          invoiceDate: '2026-04-01',
        })
        .expect(403);
    });

    it('returns 404 for sale with unknown vehicle', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/finance/invoices/sale')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          vehicleId: fakeUuid,
          buyerName: 'Buyer',
          totalAmountMinor: 100_00,
          invoiceDate: '2026-04-01',
        })
        .expect(404);
    });

    it('returns 404 for billing with unknown client', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/finance/invoices/billing/lease')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          clientId: fakeUuid,
          leaseContractId: fakeUuid,
          billingPeriod: 'April 2026',
          totalAmountMinor: 50_000_00,
          invoiceDate: '2026-04-01',
        })
        .expect(404);
    });
  });

  describe('inventory catalog parts — postgres unique mapping', () => {
    it('returns 409 INVENTORY_PART_NAME_DUPLICATE for duplicate part name (not 500)', async () => {
      const name = `Dup Catalog Part ${Date.now()}`;
      await request(app.getHttpServer())
        .post('/api/v1/finance/inventory-parts')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ organizationId, name, partCode: null })
        .expect(201);

      const dup = await request(app.getHttpServer())
        .post('/api/v1/finance/inventory-parts')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ organizationId, name, partCode: 'OTHER-CODE' })
        .expect(409);

      expect(dup.body).toMatchObject({
        statusCode: 409,
        code: 'INVENTORY_PART_NAME_DUPLICATE',
      });
      expect((dup.body as { code: string }).code).not.toBe('INTERNAL_ERROR');
    });
  });
});
