/// <reference types="jest" />

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import { AppModule } from '../../app.module';
import { GlobalHttpExceptionFilter } from '../../common/filters/http-exception.filter';
import {
  DEV_ADMIN_EMAIL,
  DEV_ADMIN_PASSWORD,
  DEV_ORG_SLUG,
  seedDevAdminBootstrap,
} from '../../database/seed/dev-admin-bootstrap';
import { ensureTestSchema } from '../../../test/helpers/ensure-test-schema';
import {
  ensureUserWithPermissions,
  loginAs,
} from '../../../test/helpers/integration-auth';
import { expectAuditLog } from '../../../test/helpers/audit-assert';
import * as schema from '../../database/schema';
import { organizations } from '../../database/schema';

type AuthLoginResponse = { accessToken: string };
type LeaseContractSummaryResponse = {
  activeContracts: number;
  draft: number;
};
type LeaseContractResponse = {
  id: string;
  contractNumber: string;
  rawStatus: string;
};
type FleetClientResponse = {
  id: string;
  companyName: string;
  taxId?: string | null;
  contractCount?: number;
  pointsOfContact?: Array<{ name: string; isPrimary: boolean }>;
};
type AssetAvailabilityBatchResponse = {
  lines: Array<{
    assetClass: string;
    mvpAvailableNowCovers: boolean;
    mvpShortByCount: number;
    availableNow: number;
  }>;
  mvpAllLinesCovered: boolean;
};
type PaginatedClientsResponse = { items: FleetClientResponse[] };
type LeaseContractDetailResponse = {
  rawStatus: string;
  status: string;
  client: { companyName: string } | null;
  availableActions: {
    editContract: { allowed: boolean };
    deactivate?: { allowed: boolean };
  };
  contractFullyAllocated?: boolean;
  statusBanner?: { level: string; text: string } | null;
  assetLines: Array<{ lineStatusLabel?: string; availabilityCovered: boolean }>;
};
type ConfirmLeaseContractResponse = {
  activatedStatus: string;
  contract: LeaseContractDetailResponse;
};
type FleetAssetClassListResponse = { items: string[] };

const FLEET_VIEW_ONLY_USER = {
  email: 'fleet-leasing.viewonly@grubpac.local',
  password: 'FleetViewOnly123!',
  fullName: 'Fleet Leasing View Only',
  roleName: 'Fleet Leasing View Only',
  permissionKeys: ['fleet_leasing.view'],
} as const;

describe('Fleet leasing lease contracts (integration)', () => {
  if (process.env.SKIP_DB_INTEGRATION === '1') {
    it.todo('skipped when SKIP_DB_INTEGRATION=1');
    return;
  }

  let app: INestApplication<App>;
  let pool: Pool;
  let organizationId: string;
  let accessToken: string;
  let fleetViewOnlyToken: string;
  let db: ReturnType<typeof drizzle<typeof schema>>;

  beforeAll(async () => {
    const connectionString =
      process.env.DATABASE_URL ??
      'postgresql://grubpac:grubpac_dev@localhost:5432/grubpac_erp';
    pool = new Pool({ connectionString });
    await pool.query('SELECT 1');
    await ensureTestSchema();
    db = drizzle(pool, { schema });
    await seedDevAdminBootstrap(db);
    const [org] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, DEV_ORG_SLUG))
      .limit(1);
    organizationId = org?.id ?? '';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new GlobalHttpExceptionFilter());
    app.setGlobalPrefix('api/v1');
    await app.init();
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: DEV_ADMIN_EMAIL, password: DEV_ADMIN_PASSWORD });
    const loginBody = login.body as AuthLoginResponse;
    accessToken = loginBody.accessToken;
    await ensureUserWithPermissions(db, organizationId, FLEET_VIEW_ONLY_USER);
    fleetViewOnlyToken = await loginAs(
      app,
      FLEET_VIEW_ONLY_USER.email,
      FLEET_VIEW_ONLY_USER.password,
    );
  });

  afterAll(async () => {
    await app?.close();
    await pool?.end();
  });

  it('returns summary and creates draft contract', async () => {
    const summary = await request(app.getHttpServer())
      .get('/api/v1/fleet-leasing/lease-contracts/summary')
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
    const summaryBody = summary.body as LeaseContractSummaryResponse;
    expect(typeof summaryBody.activeContracts).toBe('number');
    expect(typeof summaryBody.draft).toBe('number');

    const created = await request(app.getHttpServer())
      .post('/api/v1/fleet-leasing/lease-contracts')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({ organizationId })
      .expect((res) => {
        expect([200, 201]).toContain(res.status);
      });

    const createdBody = created.body as LeaseContractResponse;
    expect(createdBody.contractNumber).toMatch(/^LC-/);
    expect(createdBody.rawStatus).toBe('draft');

    const clientRes = await request(app.getHttpServer())
      .post('/api/v1/fleet-leasing/clients')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        companyName: 'Meridian Logistics Pvt Ltd',
        address: 'Mumbai',
        pointsOfContact: [
          {
            name: 'Aditi Rao',
            contactNumber: '+919999999999',
            email: 'aditi@meridian.example',
            isPrimary: true,
          },
        ],
      })
      .expect((res) => expect([200, 201]).toContain(res.status));
    const clientBody = clientRes.body as FleetClientResponse;

    const search = await request(app.getHttpServer())
      .get('/api/v1/fleet-leasing/clients')
      .query({ organizationId, search: 'Aditi' })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);

    const searchBody = search.body as PaginatedClientsResponse;
    expect(searchBody.items.length).toBeGreaterThanOrEqual(1);

    await request(app.getHttpServer())
      .patch(`/api/v1/fleet-leasing/lease-contracts/${createdBody.id}`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({ clientId: clientBody.id })
      .expect(200);

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/fleet-leasing/lease-contracts/${createdBody.id}`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
    const detailBody = detail.body as LeaseContractDetailResponse;
    expect(detailBody.rawStatus).toBe('draft');
    expect(detailBody.client?.companyName).toContain('Meridian');
    expect(detailBody.availableActions.editContract.allowed).toBe(true);
  });

  it('LEASE-02: client search empty, create with taxId, reject unknown keys', async () => {
    const noMatch = await request(app.getHttpServer())
      .get('/api/v1/fleet-leasing/clients')
      .query({
        organizationId,
        search: 'zz-no-client-match-lease02',
      })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
    const noMatchBody = noMatch.body as PaginatedClientsResponse;
    expect(noMatchBody.items).toEqual([]);

    await request(app.getHttpServer())
      .post('/api/v1/fleet-leasing/clients')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        companyName: 'Sunrise Freight Co LEASE02',
        taxId: '29ABCDE1234F1Z5',
        pointsOfContact: [
          {
            name: 'Arjun Mehta',
            contactNumber: '+919876543210',
            email: 'arjun@sunrise-freight.example',
            isPrimary: true,
          },
        ],
        unexpectedField: true,
      })
      .expect(400);

    const created = await request(app.getHttpServer())
      .post('/api/v1/fleet-leasing/clients')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        companyName: 'Sunrise Freight Co LEASE02',
        taxId: '29ABCDE1234F1Z5',
        pointsOfContact: [
          {
            name: 'Arjun Mehta',
            contactNumber: '+919876543210',
            email: 'arjun@sunrise-freight.example',
            isPrimary: true,
          },
        ],
      })
      .expect((res) => expect([200, 201]).toContain(res.status));

    const createdBody = created.body as FleetClientResponse;
    expect(createdBody.taxId).toBe('29ABCDE1234F1Z5');
    const primary = createdBody.pointsOfContact?.find((p) => p.isPrimary);
    expect(primary?.name).toBe('Arjun Mehta');

    const byName = await request(app.getHttpServer())
      .get('/api/v1/fleet-leasing/clients')
      .query({ organizationId, search: 'Sunrise Freight Co LEASE02' })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
    const byNameBody = byName.body as PaginatedClientsResponse;
    expect(byNameBody.items.some((c) => c.id === createdBody.id)).toBe(true);
  });

  it('LEASE-02: client list includes contractCount', async () => {
    const list = await request(app.getHttpServer())
      .get('/api/v1/fleet-leasing/clients')
      .query({ organizationId, page: 1, pageSize: 10 })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
    const body = list.body as PaginatedClientsResponse;
    expect(body.items.length).toBeGreaterThanOrEqual(1);
    for (const item of body.items) {
      expect(typeof item.contractCount).toBe('number');
    }
  });

  it('LEASE-03: batch availability preview exposes MVP available-now gate', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/fleet-leasing/asset-classes/availability/preview')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        lines: [
          { assetClass: 'Nonexistent Class LEASE03', committedQuantity: 2 },
        ],
      })
      .expect(200);
    const body = res.body as AssetAvailabilityBatchResponse;
    expect(body.lines).toHaveLength(1);
    expect(body.lines[0].mvpAvailableNowCovers).toBe(false);
    expect(body.mvpAllLinesCovered).toBe(false);
    expect(body.lines[0].mvpShortByCount).toBe(2);
  });

  it('LEASE-05: stepwise draft confirm activates contract (MVP)', async () => {
    const unique = Date.now();
    const assetClass = 'Sedan';

    await request(app.getHttpServer())
      .post('/api/v1/fleet-leasing/vehicles')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        vin: `VIN-LEASE05-${unique}`,
        registrationNo: `MH-LEASE05-${unique}`,
        registrationExpiry: '2030-12-31',
        insuranceExpiry: '2030-12-31',
        assetClass,
      })
      .expect((res) => expect([200, 201]).toContain(res.status));

    const clientRes = await request(app.getHttpServer())
      .post('/api/v1/fleet-leasing/clients')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        companyName: `LEASE05 Client ${unique}`,
        pointsOfContact: [
          {
            name: 'POC LEASE05',
            contactNumber: '+919999999998',
            email: `lease05-${unique}@example.com`,
            isPrimary: true,
          },
        ],
      })
      .expect((res) => expect([200, 201]).toContain(res.status));
    const clientBody = clientRes.body as FleetClientResponse;

    const draftRes = await request(app.getHttpServer())
      .post('/api/v1/fleet-leasing/lease-contracts')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({ organizationId, clientId: clientBody.id })
      .expect((res) => expect([200, 201]).toContain(res.status));
    const draftBody = draftRes.body as LeaseContractDetailResponse & {
      id: string;
    };

    await request(app.getHttpServer())
      .put(`/api/v1/fleet-leasing/lease-contracts/${draftBody.id}/asset-lines`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        assetLines: [
          {
            assetClass,
            committedQuantity: 1,
            ratePerVehicleMonth: '34500.00',
          },
        ],
      })
      .expect(200);

    await request(app.getHttpServer())
      .put(`/api/v1/fleet-leasing/lease-contracts/${draftBody.id}/terms`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        startDate: '2026-01-12',
        termMonths: 24,
        securityDeposit: '45000.00',
        billingFrequency: 'monthly',
      })
      .expect(200);

    const confirmRes = await request(app.getHttpServer())
      .post(`/api/v1/fleet-leasing/lease-contracts/${draftBody.id}/confirm`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect((res) => expect([200, 201]).toContain(res.status));

    const confirmBody = confirmRes.body as ConfirmLeaseContractResponse;
    expect(confirmBody.activatedStatus).toBe('active');
    expect(confirmBody.contract.rawStatus).toBe('active');
    expect(confirmBody.contract.status).toBe('Active');

    await expectAuditLog(db, {
      organizationId,
      action: 'lease_contract.confirm',
      resourceId: draftBody.id,
    });

    const detailRes = await request(app.getHttpServer())
      .get(`/api/v1/fleet-leasing/lease-contracts/${draftBody.id}`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
    const detailBody = detailRes.body as LeaseContractDetailResponse;
    expect(detailBody.contractFullyAllocated).toBe(true);
    expect(detailBody.statusBanner?.level).toBe('success');
    expect(detailBody.assetLines[0]?.lineStatusLabel).toBe('Allocated');
    expect(detailBody.availableActions.deactivate?.allowed).toBe(true);
  });

  it('LEASE-05: confirm requires auth and update permission', async () => {
    const draft = await request(app.getHttpServer())
      .post('/api/v1/fleet-leasing/lease-contracts')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({ organizationId })
      .expect((res) => expect([200, 201]).toContain(res.status));
    const draftId = (draft.body as LeaseContractResponse).id;

    await request(app.getHttpServer())
      .post(`/api/v1/fleet-leasing/lease-contracts/${draftId}/confirm`)
      .query({ organizationId })
      .expect(401);

    await request(app.getHttpServer())
      .post(`/api/v1/fleet-leasing/lease-contracts/${draftId}/confirm`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${fleetViewOnlyToken}`)
      .set('x-organization-id', organizationId)
      .expect(403);
  });

  it('lists distinct fleet asset classes for the organization', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/fleet-leasing/asset-classes')
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);

    const body = res.body as FleetAssetClassListResponse;
    expect(Array.isArray(body.items)).toBe(true);
  });
});
