/// <reference types="jest" />

import { randomUUID } from 'crypto';
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
import {
  createDraftLeaseContract,
  createFleetClientForIntegrationTest,
} from '../../../test/helpers/fleet-leasing-test.util';
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
  subtitle?: string;
  termMonths?: number | null;
  client: { companyName: string } | null;
  availableActions: {
    editContract: { allowed: boolean };
    deactivate?: { allowed: boolean };
    terminate?: { allowed: boolean; disabledReason?: string };
    reactivate?: { allowed: boolean };
  };
  contractFullyAllocated?: boolean;
  statusBanner?: { level: string; text: string } | null;
  assetLines: Array<{ lineStatusLabel?: string; availabilityCovered: boolean }>;
  hasFieldChangeHistory?: boolean;
};
type ConfirmLeaseContractResponse = {
  activatedStatus: string;
  contract: LeaseContractDetailResponse;
};
type FleetAssetClassListResponse = { items: string[] };
type LeaseContractReviewResponse = { reviewAction: string };
type ApiErrorResponse = { message: string; code?: string; statusCode?: number };

const FLEET_VIEW_ONLY_USER = {
  email: 'fleet-leasing.viewonly@grubpac.local',
  password: 'FleetViewOnly123!',
  fullName: 'Fleet Leasing View Only',
  roleName: 'Fleet Leasing View Only',
  permissionKeys: ['fleet_leasing.view'],
} as const;

const FLEET_UPDATE_ONLY_USER = {
  email: 'fleet-leasing.updateonly@grubpac.local',
  password: 'FleetUpdateOnly123!',
  fullName: 'Fleet Leasing Update Only',
  roleName: 'Fleet Leasing Update Only',
  permissionKeys: ['fleet_leasing.view', 'fleet_leasing.update'],
} as const;

describe('Fleet leasing lease contracts (integration)', () => {
  jest.setTimeout(60_000);

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

  it('LEASE-01: list and create require authentication', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/fleet-leasing/lease-contracts')
      .query({ organizationId, page: 1, pageSize: 10 })
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/v1/fleet-leasing/lease-contracts')
      .send({ organizationId })
      .expect(401);
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

    const createdBody = await createDraftLeaseContract(app, {
      organizationId,
      token: accessToken,
    });
    expect(createdBody.contractNumber).toMatch(/^LC-/);
    expect(createdBody.rawStatus).toBe('draft');

    const emptyClientDraft = await request(app.getHttpServer())
      .post('/api/v1/fleet-leasing/lease-contracts')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({ organizationId, clientId: '' })
      .expect((res) => expect([200, 201]).toContain(res.status));
    expect((emptyClientDraft.body as LeaseContractResponse).rawStatus).toBe(
      'draft',
    );

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
    const lease02Token = `lease02-${randomUUID()}`;
    const companyName = `Sunrise Freight Co ${lease02Token}`;
    const taxId = `29ABCDE1234F1Z${lease02Token.slice(-2).toUpperCase()}`;

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
        companyName,
        taxId,
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
        companyName,
        taxId,
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
    expect(createdBody.taxId).toBe(taxId);
    const primary = createdBody.pointsOfContact?.find((p) => p.isPrimary);
    expect(primary?.name).toBe('Arjun Mehta');

    const byName = await request(app.getHttpServer())
      .get('/api/v1/fleet-leasing/clients')
      .query({ organizationId, search: lease02Token })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
    const byNameBody = byName.body as PaginatedClientsResponse;
    expect(byNameBody.items.some((c) => c.id === createdBody.id)).toBe(true);

    const orgList = await request(app.getHttpServer())
      .get('/api/v1/organisation/clients')
      .query({ organizationId, search: lease02Token, page: 1, pageSize: 50 })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
    const orgListBody = orgList.body as {
      items: Array<{ clientName: string }>;
    };
    expect(
      orgListBody.items.some((row) => row.clientName.includes(lease02Token)),
    ).toBe(true);
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

  async function seedAssetRegisterClassWithVehicle(
    className: string,
    unique: number,
  ): Promise<void> {
    const classRes = await request(app.getHttpServer())
      .post('/api/v1/asset-register/asset-classes')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        name: className,
        vehicleType: '4W',
        fuelType: 'Diesel',
        fuelTankCapacity: 60,
        ratedLoadFrom: 500,
        ratedLoadTo: 1500,
      })
      .expect((res) => expect([200, 201]).toContain(res.status));
    const classId = (classRes.body as { id: string }).id;

    const masterRes = await request(app.getHttpServer())
      .post('/api/v1/asset-register/asset-masters')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        assetClassId: classId,
        name: `Master ${unique}`,
      })
      .expect((res) => expect([200, 201]).toContain(res.status));
    const masterId = (masterRes.body as { id: string }).id;

    await request(app.getHttpServer())
      .post('/api/v1/asset-register/vehicles')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        assetClassId: classId,
        assetMasterId: masterId,
        registrationNumber: `AR-L05-${unique}`.slice(0, 32),
        chassisNumber: `CH-L05-${unique}`,
        modelYear: 2024,
        odometer: 0,
        registrationStartDate: '2024-01-01',
        registrationEndDate: '2029-01-01',
        insuranceStartDate: '2024-01-01',
        insuranceEndDate: '2030-01-01',
        insurancePremium: 10000,
        warrantyStartDate: '2024-01-01',
        warrantyEndDate: '2027-01-01',
      })
      .expect((res) => expect([200, 201]).toContain(res.status));
  }

  it('LEASE-05: stepwise draft confirm activates contract (MVP)', async () => {
    const unique = Date.now();
    const assetClass = 'Sedan';

    await seedAssetRegisterClassWithVehicle(assetClass, unique);

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
    expect(detailBody.contractFullyAllocated).toBe(false);
    expect(detailBody.statusBanner).toBeNull();
    expect(detailBody.subtitle).toMatch(/0 of 1 committed/i);
    expect(detailBody.assetLines[0]?.lineStatusLabel).toBe('Awaiting Assets');
    expect(detailBody.availableActions.deactivate?.allowed).toBe(true);
  });

  it('LEASE-05: confirm activates draft with non-standard rates (MVP)', async () => {
    const unique = Date.now();
    const assetClass = 'Sedan';
    await seedAssetRegisterClassWithVehicle(assetClass, unique);

    const clientRes = await request(app.getHttpServer())
      .post('/api/v1/fleet-leasing/clients')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        companyName: `LEASE05 Rate ${unique}`,
        pointsOfContact: [
          {
            name: 'POC',
            contactNumber: '+919999999997',
            email: `lease05-rate-${unique}@example.com`,
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
            ratePerVehicleMonth: '1000.00',
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
        startDate: '2026-02-01',
        termMonths: 12,
        securityDeposit: '50000.00',
        billingFrequency: 'monthly',
      })
      .expect(200);

    const reviewRes = await request(app.getHttpServer())
      .get(`/api/v1/fleet-leasing/lease-contracts/${draftBody.id}/review`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
    const reviewBody = reviewRes.body as LeaseContractReviewResponse;
    expect(reviewBody.reviewAction).toBe('confirm_contract');

    const confirmRes = await request(app.getHttpServer())
      .post(`/api/v1/fleet-leasing/lease-contracts/${draftBody.id}/confirm`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect((res) => expect([200, 201]).toContain(res.status));

    const confirmBody = confirmRes.body as ConfirmLeaseContractResponse;
    expect(['active', 'awaiting_assets']).toContain(
      confirmBody.activatedStatus,
    );
    expect(confirmBody.contract.rawStatus).not.toBe('pending_approval');
  });

  it('LEASE-05: activate rejects draft status', async () => {
    const clientId = await createFleetClientForIntegrationTest(
      app,
      organizationId,
      accessToken,
      'LEASE05-activate',
    );
    const { id: draftId } = await createDraftLeaseContract(app, {
      organizationId,
      token: accessToken,
      clientId,
    });

    const activateRes = await request(app.getHttpServer())
      .post(`/api/v1/fleet-leasing/lease-contracts/${draftId}/activate`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(400);

    const activateError = activateRes.body as ApiErrorResponse;
    expect(activateError.message).toMatch(
      /cannot be activated from current status/i,
    );
  });

  it('LEASE-05: confirm requires auth and update permission', async () => {
    const clientId = await createFleetClientForIntegrationTest(
      app,
      organizationId,
      accessToken,
      'LEASE05-confirm-auth',
    );
    const { id: draftId } = await createDraftLeaseContract(app, {
      organizationId,
      token: accessToken,
      clientId,
    });

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

  it('LEASE-06: PATCH update auth, validation, IDOR, and audit', async () => {
    const { id: draftId } = await createDraftLeaseContract(app, {
      organizationId,
      token: accessToken,
    });

    const detailBeforePatch = await request(app.getHttpServer())
      .get(`/api/v1/fleet-leasing/lease-contracts/${draftId}`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
    expect(
      (detailBeforePatch.body as LeaseContractDetailResponse)
        .hasFieldChangeHistory,
    ).toBe(false);

    const historyClientSuffix = randomUUID().slice(0, 8);
    const historyClientName = `LEASE06 History Client ${historyClientSuffix}`;

    const historyClientRes = await request(app.getHttpServer())
      .post('/api/v1/fleet-leasing/clients')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        companyName: historyClientName,
        pointsOfContact: [
          {
            name: 'POC LEASE06 History',
            contactNumber: '+919999999997',
            email: `lease06-history-${historyClientSuffix}@example.com`,
            isPrimary: true,
          },
        ],
      })
      .expect((res) => expect([200, 201]).toContain(res.status));
    const historyClientId = (historyClientRes.body as FleetClientResponse).id;

    await request(app.getHttpServer())
      .patch(`/api/v1/fleet-leasing/lease-contracts/${draftId}`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({ clientId: historyClientId })
      .expect(200);

    const detailAfterFirstPatch = await request(app.getHttpServer())
      .get(`/api/v1/fleet-leasing/lease-contracts/${draftId}`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
    expect(
      (detailAfterFirstPatch.body as LeaseContractDetailResponse)
        .hasFieldChangeHistory,
    ).toBe(true);

    await request(app.getHttpServer())
      .patch(`/api/v1/fleet-leasing/lease-contracts/${draftId}`)
      .query({ organizationId })
      .send({ description: 'No token' })
      .expect(401);

    await request(app.getHttpServer())
      .patch(`/api/v1/fleet-leasing/lease-contracts/${draftId}`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${fleetViewOnlyToken}`)
      .set('x-organization-id', organizationId)
      .send({ description: 'View only edit' })
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/api/v1/fleet-leasing/lease-contracts/${draftId}`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({ description: 'Updated description', unexpectedKey: true })
      .expect(400);

    const fakeOrgId = '00000000-0000-4000-8000-000000000099';
    await request(app.getHttpServer())
      .patch(`/api/v1/fleet-leasing/lease-contracts/${draftId}`)
      .query({ organizationId: fakeOrgId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', fakeOrgId)
      .send({ description: 'Cross org' })
      .expect((res) => expect([403, 404]).toContain(res.status));

    await request(app.getHttpServer())
      .patch(`/api/v1/fleet-leasing/lease-contracts/${draftId}`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({ description: 'Clerical note on draft' })
      .expect(200);

    await expectAuditLog(db, {
      organizationId,
      action: 'lease_contract.update',
      resourceId: draftId,
    });

    const historyRes = await request(app.getHttpServer())
      .get(`/api/v1/fleet-leasing/lease-contracts/${draftId}/change-history`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);

    const historyBody = historyRes.body as {
      contractId: string;
      items: Array<{
        field: string;
        fromValue: string;
        toValue: string;
        changedBy: string;
      }>;
    };
    expect(historyBody.contractId).toBe(draftId);
    expect(
      historyBody.items.some(
        (row) =>
          row.field === 'description' &&
          row.toValue === 'Clerical note on draft',
      ),
    ).toBe(true);
    expect(
      historyBody.items.some(
        (row) =>
          row.field === 'clientId' &&
          row.toValue === historyClientName &&
          row.toValue !== historyClientId,
      ),
    ).toBe(true);
    expect(historyBody.items[0]?.changedBy).toBeTruthy();

    await request(app.getHttpServer())
      .get(`/api/v1/fleet-leasing/lease-contracts/${draftId}/change-history`)
      .query({ organizationId })
      .expect(401);
  });

  it('LEASE-06: PATCH blocked on deactivated (rule 31)', async () => {
    const { id: contractId } = await createDraftLeaseContract(app, {
      organizationId,
      token: accessToken,
    });

    await db
      .update(schema.leaseContracts)
      .set({ status: 'deactivated', onHold: true })
      .where(eq(schema.leaseContracts.id, contractId));

    const patchRes = await request(app.getHttpServer())
      .patch(`/api/v1/fleet-leasing/lease-contracts/${contractId}`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({ description: 'Should fail while inactive' })
      .expect(409);

    const patchError = patchRes.body as ApiErrorResponse;
    expect(patchError.message).toMatch(/cannot be edited until reactivated/i);
  });

  it('LEASE-06: PATCH blocked on pending termination', async () => {
    const unique = Date.now();
    const clientRes = await request(app.getHttpServer())
      .post('/api/v1/fleet-leasing/clients')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        companyName: `LEASE06 Term Client ${unique}`,
        pointsOfContact: [
          {
            name: 'Term POC',
            contactNumber: '+919999999997',
            email: `lease06-${unique}@example.com`,
            isPrimary: true,
          },
        ],
      })
      .expect((res) => expect([200, 201]).toContain(res.status));
    const clientId = (clientRes.body as FleetClientResponse).id;

    const created = await request(app.getHttpServer())
      .post('/api/v1/fleet-leasing/lease-contracts')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({ organizationId, clientId })
      .expect((res) => expect([200, 201]).toContain(res.status));
    const contractId = (created.body as LeaseContractResponse).id;

    await db
      .update(schema.leaseContracts)
      .set({ status: 'pending_termination' })
      .where(eq(schema.leaseContracts.id, contractId));

    await request(app.getHttpServer())
      .patch(`/api/v1/fleet-leasing/lease-contracts/${contractId}`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({ description: 'Should fail' })
      .expect(409);
  });

  it('LEASE-08: single-step terminate closes contract; legacy pending can complete', async () => {
    await ensureUserWithPermissions(db, organizationId, FLEET_UPDATE_ONLY_USER);
    const updateOnlyToken = await loginAs(
      app,
      FLEET_UPDATE_ONLY_USER.email,
      FLEET_UPDATE_ONLY_USER.password,
    );

    const { id: contractId } = await createDraftLeaseContract(app, {
      organizationId,
      token: accessToken,
    });

    await db
      .update(schema.leaseContracts)
      .set({
        status: 'deactivated',
        onHold: true,
        billingPaused: false,
      })
      .where(eq(schema.leaseContracts.id, contractId));

    const beforeTerminate = await request(app.getHttpServer())
      .get(`/api/v1/fleet-leasing/lease-contracts/${contractId}`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${updateOnlyToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
    expect(
      (beforeTerminate.body as LeaseContractDetailResponse).availableActions
        .terminate?.allowed,
    ).toBe(true);

    await request(app.getHttpServer())
      .post(`/api/v1/fleet-leasing/lease-contracts/${contractId}/terminate`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${updateOnlyToken}`)
      .set('x-organization-id', organizationId)
      .expect((res) => expect([200, 201]).toContain(res.status));

    const closedDetail = await request(app.getHttpServer())
      .get(`/api/v1/fleet-leasing/lease-contracts/${contractId}`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
    const closedBody = closedDetail.body as LeaseContractDetailResponse;
    expect(closedBody.rawStatus).toBe('closed');
    expect(closedBody.statusBanner).toBeNull();
    expect(closedBody.availableActions.terminate?.allowed).toBe(false);
    expect(closedBody.availableActions.reactivate?.allowed).toBe(false);

    await request(app.getHttpServer())
      .post(`/api/v1/fleet-leasing/lease-contracts/${contractId}/reactivate`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(400);

    await request(app.getHttpServer())
      .post(
        `/api/v1/fleet-leasing/lease-contracts/${contractId}/request-termination`,
      )
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(410);

    const { id: legacyContractId } = await createDraftLeaseContract(app, {
      organizationId,
      token: accessToken,
    });

    await db
      .update(schema.leaseContracts)
      .set({ status: 'pending_termination', onHold: true })
      .where(eq(schema.leaseContracts.id, legacyContractId));

    await request(app.getHttpServer())
      .post(
        `/api/v1/fleet-leasing/lease-contracts/${legacyContractId}/terminate`,
      )
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect((res) => expect([200, 201]).toContain(res.status));

    const legacyClosed = await request(app.getHttpServer())
      .get(`/api/v1/fleet-leasing/lease-contracts/${legacyContractId}`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
    expect((legacyClosed.body as LeaseContractDetailResponse).rawStatus).toBe(
      'closed',
    );
  });

  it('LEASE-07: deactivate active contract writes audit log', async () => {
    const { id: contractId } = await createDraftLeaseContract(app, {
      organizationId,
      token: accessToken,
    });

    await db
      .update(schema.leaseContracts)
      .set({ status: 'active', onHold: false, billingPaused: false })
      .where(eq(schema.leaseContracts.id, contractId));

    await request(app.getHttpServer())
      .post(`/api/v1/fleet-leasing/lease-contracts/${contractId}/deactivate`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({ reason: 'Integration lattice deactivate' })
      .expect((res) => expect([200, 201]).toContain(res.status));

    const auditRow = await expectAuditLog(db, {
      organizationId,
      action: 'lease_contract.deactivate',
      resourceId: contractId,
    });
    expect(auditRow.metadata).toEqual(
      expect.objectContaining({ reason: 'Integration lattice deactivate' }),
    );
  });

  async function createActiveLeaseContract(unique: number): Promise<string> {
    const assetClass = 'Sedan';
    await seedAssetRegisterClassWithVehicle(assetClass, unique);

    const clientRes = await request(app.getHttpServer())
      .post('/api/v1/fleet-leasing/clients')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        companyName: `Renew Client ${unique}`,
        pointsOfContact: [
          {
            name: 'POC Renew',
            contactNumber: '+919999999996',
            email: `renew-${unique}@example.com`,
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
    const draftId = (draftRes.body as LeaseContractResponse).id;

    await request(app.getHttpServer())
      .put(`/api/v1/fleet-leasing/lease-contracts/${draftId}/asset-lines`)
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
      .put(`/api/v1/fleet-leasing/lease-contracts/${draftId}/terms`)
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

    await request(app.getHttpServer())
      .post(`/api/v1/fleet-leasing/lease-contracts/${draftId}/confirm`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect((res) => expect([200, 201]).toContain(res.status));

    return draftId;
  }

  it('LEASE-16/17/18: renewal eligible list, renew 24mo renewal, 6mo extension, closed excluded', async () => {
    await ensureUserWithPermissions(db, organizationId, FLEET_UPDATE_ONLY_USER);
    const updateOnlyToken = await loginAs(
      app,
      FLEET_UPDATE_ONLY_USER.email,
      FLEET_UPDATE_ONLY_USER.password,
    );

    const unique = Date.now();
    const activeId = await createActiveLeaseContract(unique);

    const eligibleRes = await request(app.getHttpServer())
      .get('/api/v1/fleet-leasing/renewals-extensions')
      .query({ organizationId, page: 1, pageSize: 50 })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
    const eligibleIds = (
      eligibleRes.body as { items: Array<{ id: string }> }
    ).items.map((row) => row.id);
    expect(eligibleIds).toContain(activeId);

    const renewRes = await request(app.getHttpServer())
      .post(`/api/v1/fleet-leasing/lease-contracts/${activeId}/renew`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${updateOnlyToken}`)
      .set('x-organization-id', organizationId)
      .send({ newTermMonths: 24, newStartDate: '2027-02-01' })
      .expect((res) => expect([200, 201]).toContain(res.status));
    const renewBody = renewRes.body as {
      outcomeKind: string;
      contract: LeaseContractDetailResponse & {
        termMonths: number;
        rawStatus: string;
        subtitle: string;
        statusBanner?: { level: string } | null;
      };
    };
    expect(renewBody.outcomeKind).toBe('renewal');
    expect(renewBody.contract.rawStatus).toBe('active');
    expect(renewBody.contract.termMonths).toBe(24);
    expect(renewBody.contract.subtitle).toMatch(/renewed/i);
    expect(renewBody.contract.statusBanner?.level).not.toBe('success');

    await expectAuditLog(db, {
      organizationId,
      action: 'lease_contract.renew',
      resourceId: activeId,
    });

    const extendRes = await request(app.getHttpServer())
      .post(`/api/v1/fleet-leasing/lease-contracts/${activeId}/renew`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${updateOnlyToken}`)
      .set('x-organization-id', organizationId)
      .send({ newTermMonths: 6, newStartDate: '2028-03-01' })
      .expect((res) => expect([200, 201]).toContain(res.status));
    expect((extendRes.body as { outcomeKind: string }).outcomeKind).toBe(
      'extension',
    );

    const closedUnique = unique + 1;
    const closedId = await createActiveLeaseContract(closedUnique);
    await db
      .update(schema.leaseContracts)
      .set({ status: 'closed', onHold: true })
      .where(eq(schema.leaseContracts.id, closedId));

    const afterCloseRes = await request(app.getHttpServer())
      .get('/api/v1/fleet-leasing/renewals-extensions')
      .query({ organizationId, page: 1, pageSize: 50 })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
    const afterCloseIds = (
      afterCloseRes.body as { items: Array<{ id: string }> }
    ).items.map((row) => row.id);
    expect(afterCloseIds).toContain(activeId);
    expect(afterCloseIds).not.toContain(closedId);

    await request(app.getHttpServer())
      .post(`/api/v1/fleet-leasing/lease-contracts/${closedId}/renew`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${updateOnlyToken}`)
      .set('x-organization-id', organizationId)
      .send({ newTermMonths: 12, newStartDate: '2027-01-01' })
      .expect(400);
  });

  it('lists distinct asset register class names for the organization', async () => {
    const unique = Date.now();
    const className = `Register Class ${unique}`;
    await request(app.getHttpServer())
      .post('/api/v1/asset-register/asset-classes')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        name: className,
        vehicleType: '2W',
        fuelType: 'Petrol',
        fuelTankCapacity: 10,
        ratedLoadFrom: 100,
        ratedLoadTo: 200,
      })
      .expect((res) => expect([200, 201]).toContain(res.status));

    const res = await request(app.getHttpServer())
      .get('/api/v1/fleet-leasing/asset-classes')
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);

    const body = res.body as FleetAssetClassListResponse;
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items).toContain(className);
  });
});
