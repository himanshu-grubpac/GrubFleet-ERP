/// <reference types="jest" />

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import type { AppDatabase } from '../../database/database.module';
import { financeInvoices } from '../../database/schema';
import {
  bootstrapIntegrationAuth,
  ensureUserWithPermissions,
  loginAs,
  type IntegrationAuthContext,
} from '../../../test/helpers/integration-auth';
import { expectAuditLog } from '../../../test/helpers/audit-assert';

const FINANCE_VIEW_ONLY_USER = {
  email: 'finance.cs.viewonly@grubpac.local',
  password: 'FinanceCsView123!',
  fullName: 'Finance CS View Only',
  roleName: 'Finance CS View Only',
  permissionKeys: ['finance.view'],
} as const;

const NO_FINANCE_USER = {
  email: 'finance.cs.denied@grubpac.local',
  password: 'FinanceCsDenied123!',
  fullName: 'Finance CS Denied',
  roleName: 'Finance CS Denied',
  permissionKeys: ['organisation.view'],
} as const;

describe('Finance client statements (integration)', () => {
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
  let clientId: string;
  let clientWithoutBillingId: string;

  const periodStart = '2026-07-01';
  const periodEnd = '2026-09-30';

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

    const clientRes = await request(app.getHttpServer())
      .post('/api/v1/organisation/clients')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        clientName: `CS Client ${unique}`,
        addressLine1: 'Line 1',
        addressCountry: 'IN',
        addressState: 'Maharashtra',
        addressDistrict: 'Mumbai',
        addressPincode: '400001',
        pointsOfContact: [
          {
            name: 'POC',
            email: `cs.client.${unique}@grubpac.local`,
            contactNumber: '+919876543210',
            isPrimary: true,
          },
        ],
      })
      .expect(201);
    clientId = (clientRes.body as { id: string }).id;

    const client2Res = await request(app.getHttpServer())
      .post('/api/v1/organisation/clients')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        clientName: `CS Zero Billing ${unique}`,
        addressLine1: 'Line 1',
        addressCountry: 'IN',
        addressState: 'Maharashtra',
        addressDistrict: 'Mumbai',
        addressPincode: '400002',
        pointsOfContact: [
          {
            name: 'POC2',
            email: `cs.zero.${unique}@grubpac.local`,
            contactNumber: '+919876543211',
            isPrimary: true,
          },
        ],
      })
      .expect(201);
    clientWithoutBillingId = (client2Res.body as { id: string }).id;

    await db.insert(financeInvoices).values({
      organizationId,
      invoiceNumber: `BINV-2026-CS-${unique}`,
      invoiceType: 'billing',
      status: 'unpaid',
      partyName: `CS Client ${unique}`,
      description: 'Integration billing invoice',
      totalAmountMinor: 100_000,
      amountPaidMinor: 25_000,
      invoiceDate: '2026-08-15',
      clientId,
    });

    await db.insert(financeInvoices).values({
      organizationId,
      invoiceNumber: `BINV-2026-CSC-${unique}`,
      invoiceType: 'billing',
      status: 'cancelled',
      partyName: `CS Client ${unique}`,
      description: 'Cancelled billing invoice',
      totalAmountMinor: 50_000,
      amountPaidMinor: 0,
      invoiceDate: '2026-08-20',
      clientId,
    });
  }, 120000);

  afterAll(async () => {
    await ctx?.close();
  });

  describe('security lattice', () => {
    it('returns 401 without JWT on list', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/finance/client-statements')
        .query({ organizationId, periodStart, periodEnd })
        .expect(401);
    });

    it('returns 403 without finance permission on list', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/finance/client-statements')
        .query({
          organizationId,
          periodStart,
          periodEnd,
          page: 1,
          pageSize: 10,
        })
        .set('Authorization', `Bearer ${deniedToken}`)
        .set('x-organization-id', organizationId)
        .expect(403);
    });

    it('allows finance.view on list but 403 on send', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/finance/client-statements')
        .query({
          organizationId,
          periodStart,
          periodEnd,
          page: 1,
          pageSize: 50,
        })
        .set('Authorization', `Bearer ${financeViewToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);

      await request(app.getHttpServer())
        .post(`/api/v1/finance/client-statements/${clientId}/send`)
        .set('Authorization', `Bearer ${financeViewToken}`)
        .set('x-organization-id', organizationId)
        .send({ organizationId, periodStart, periodEnd })
        .expect(403);
    });

    it('returns 403 without organization context on list', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/finance/client-statements')
        .query({ periodStart, periodEnd, page: 1, pageSize: 10 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);
    });

    it('returns 400 on unknown JSON keys on send', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/finance/client-statements/${clientId}/send`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          periodStart,
          periodEnd,
          unexpected: true,
        })
        .expect(400);
    });
  });

  describe('aggregates and detail', () => {
    it('lists clients with billing aggregates excluding cancelled from totals', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/finance/client-statements')
        .query({
          organizationId,
          periodStart,
          periodEnd,
          page: 1,
          pageSize: 50,
          search: 'CS Client',
        })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);

      const body = res.body as {
        hasAnyBillingInvoicesEver: boolean;
        items: Array<{
          clientId: string;
          invoiceCount: number;
          totalBilledMinor: number;
          totalPaidMinor: number;
          balanceDueMinor: number;
        }>;
      };

      expect(body.hasAnyBillingInvoicesEver).toBe(true);
      const row = body.items.find((i) => i.clientId === clientId);
      expect(row).toBeDefined();
      expect(row!.invoiceCount).toBe(2);
      expect(row!.totalBilledMinor).toBe(100_000);
      expect(row!.totalPaidMinor).toBe(25_000);
      expect(row!.balanceDueMinor).toBe(75_000);
    });

    it('returns detail with cancelled invoice listed but excluded from summary', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/finance/client-statements/${clientId}`)
        .query({ organizationId, periodStart, periodEnd })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);

      const body = res.body as {
        billingInvoiceCount: number;
        billableInvoiceCount: number;
        summary: {
          totalBilledMinor: number;
          balanceDueMinor: number;
        };
        invoices: Array<{ status: string; excludedFromSummaryTotals: boolean }>;
      };

      expect(body.billingInvoiceCount).toBe(2);
      expect(body.billableInvoiceCount).toBe(1);
      expect(body.summary.totalBilledMinor).toBe(100_000);
      expect(body.summary.balanceDueMinor).toBe(75_000);
      expect(body.invoices.some((i) => i.status === 'cancelled')).toBe(true);
      expect(
        body.invoices.find((i) => i.status === 'cancelled')
          ?.excludedFromSummaryTotals,
      ).toBe(true);
    });

    it('returns zero aggregates for client with no billing in period', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/finance/client-statements/${clientWithoutBillingId}`)
        .query({ organizationId, periodStart, periodEnd })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);

      const body = res.body as {
        billingInvoiceCount: number;
        summary: { totalBilledMinor: number };
        invoices: unknown[];
      };
      expect(body.billingInvoiceCount).toBe(0);
      expect(body.summary.totalBilledMinor).toBe(0);
      expect(body.invoices).toHaveLength(0);
    });

    it('records send with audit only (email deferred)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/finance/client-statements/${clientId}/send`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ organizationId, periodStart, periodEnd })
        .expect(200);

      expect((res.body as { emailDispatch: string }).emailDispatch).toBe(
        'deferred',
      );

      await expectAuditLog(db, {
        organizationId,
        action: 'finance.client_statement.send',
        resourceId: clientId,
      });
    });

    it('returns 404 for unknown client id', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/finance/client-statements/${crypto.randomUUID()}`)
        .query({ organizationId, periodStart, periodEnd })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(404);
    });
  });
});
