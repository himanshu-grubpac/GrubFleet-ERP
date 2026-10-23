/// <reference types="jest" />

import { randomUUID } from 'crypto';
import { BadRequestException, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import { AppModule } from '../../app.module';
import {
  DEV_ADMIN_EMAIL,
  DEV_ADMIN_PASSWORD,
  DEV_ORG_SLUG,
  seedDevAdminBootstrap,
} from '../../database/seed/dev-admin-bootstrap';
import { ensureTestSchema } from '../../../test/helpers/ensure-test-schema';
import {
  closeIntegrationResources,
  configureIntegrationNestApp,
  ensureUserWithPermissions,
  loginAs,
} from '../../../test/helpers/integration-auth';
import { expectAuditLog } from '../../../test/helpers/audit-assert';
import {
  createDraftLeaseContract,
  createFleetClientForIntegrationTest,
} from '../../../test/helpers/fleet-leasing-test.util';
import { fleetClientStructuredAddressIn } from '../../../test/helpers/fleet-client-address.fixture';
import { uniqueIntegrationPhone } from '../../../test/helpers/unique-integration-contact';
import * as schema from '../../database/schema';
import {
  fleetClients,
  fleetVehicleAllocations,
  fleetVehicles,
  leaseContracts,
  organizations,
} from '../../database/schema';
import { FleetClientsService } from './fleet-clients.service';

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
  closing?: { reason: string } | null;
};
type ConfirmLeaseContractResponse = {
  activatedStatus: string;
  contract: LeaseContractDetailResponse;
};
type FleetAssetClassListResponse = {
  items: string[];
  catalog: Array<{ id: string; name: string; specLabel: string }>;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
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
    configureIntegrationNestApp(app);
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
    await closeIntegrationResources(app, pool);
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

    const meridianSeed = `meridian-${Date.now()}`;
    const clientRes = await request(app.getHttpServer())
      .post('/api/v1/fleet-leasing/clients')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        companyName: 'Meridian Logistics Pvt Ltd',
        ...fleetClientStructuredAddressIn(),
        pointsOfContact: [
          {
            name: 'Aditi Rao',
            contactNumber: uniqueIntegrationPhone(meridianSeed),
            email: `${meridianSeed}@example.com`,
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

  it('LEASE-CREATE: create validation lattice (client, dates, DTO, audit)', async () => {
    const invalidClientRes = await request(app.getHttpServer())
      .post('/api/v1/fleet-leasing/lease-contracts')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        clientId: randomUUID(),
      })
      .expect(400);
    const invalidClientBody = invalidClientRes.body as ApiErrorResponse;
    expect(invalidClientBody.code).toBe('INVALID_CLIENT');

    await request(app.getHttpServer())
      .post('/api/v1/fleet-leasing/lease-contracts')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        termMonths: 0,
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/v1/fleet-leasing/lease-contracts')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        surpriseField: true,
      })
      .expect(400);

    const leaseCreateToken = `lease-create-${randomUUID().slice(0, 8)}`;
    const clientRes = await request(app.getHttpServer())
      .post('/api/v1/fleet-leasing/clients')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        companyName: `LEASE-CREATE Client ${leaseCreateToken}`,
        ...fleetClientStructuredAddressIn(),
        pointsOfContact: [
          {
            name: 'LEASE CREATE POC',
            contactNumber: uniqueIntegrationPhone(leaseCreateToken),
            email: `lease-create-${leaseCreateToken}@example.com`,
            isPrimary: true,
          },
        ],
      })
      .expect((res) => expect([200, 201]).toContain(res.status));
    const clientId = (clientRes.body as FleetClientResponse).id;

    const createdRes = await request(app.getHttpServer())
      .post('/api/v1/fleet-leasing/lease-contracts')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        clientId,
        startDate: '2026-04-01',
        termMonths: 12,
        securityDeposit: '50000.00',
        billingFrequency: 'monthly',
      })
      .expect((res) => expect([200, 201]).toContain(res.status));
    const created = createdRes.body as LeaseContractDetailResponse & {
      id: string;
      endDate?: string | null;
    };

    expect(created.endDate).toBe('2027-04-01');

    await expectAuditLog(db, {
      organizationId,
      action: 'lease_contract.create',
      resourceId: created.id,
    });
  });

  it('LEASE-02: client search empty, create with taxId, reject unknown keys', async () => {
    const lease02Token = `lease02-${randomUUID()}`;
    const companyName = `Sunrise Freight Co ${lease02Token}`;
    const taxId = '29ABCDE1234F1Z5';

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
        companyName: `Bad Postal ${lease02Token}`,
        ...fleetClientStructuredAddressIn({ addressPincode: '@invalid' }),
        pointsOfContact: [
          {
            name: 'Bad Postal POC',
            contactNumber: uniqueIntegrationPhone(lease02Token),
            email: 'bad-postal@example.com',
            isPrimary: true,
          },
        ],
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/v1/fleet-leasing/clients')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        companyName: `Bad Gstin ${lease02Token}`,
        taxId: 'NOT-A-VALID-GSTIN',
        ...fleetClientStructuredAddressIn(),
        pointsOfContact: [
          {
            name: 'Bad Gstin POC',
            contactNumber: uniqueIntegrationPhone(`${lease02Token}-gstin`),
            email: 'bad-gstin@example.com',
            isPrimary: true,
          },
        ],
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/v1/fleet-leasing/clients')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        companyName,
        taxId,
        ...fleetClientStructuredAddressIn(),
        pointsOfContact: [
          {
            name: 'Arjun Mehta',
            contactNumber: uniqueIntegrationPhone(
              `${lease02Token}-unknown-key`,
            ),
            email: `arjun-${lease02Token}@example.com`,
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
        ...fleetClientStructuredAddressIn(),
        pointsOfContact: [
          {
            name: 'Arjun Mehta',
            contactNumber: uniqueIntegrationPhone(`${lease02Token}-create`),
            email: `arjun-${lease02Token}@example.com`,
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

  it('FLEET-CLIENTS-LIST: returns 200 when sync fails for one organisation client (AUD-001)', async () => {
    const token = `aud001-${randomUUID().slice(0, 8)}`;
    const goodCreate = await request(app.getHttpServer())
      .post('/api/v1/fleet-leasing/clients')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        companyName: `Good ${token}`,
        ...fleetClientStructuredAddressIn(),
        pointsOfContact: [
          {
            name: 'Good Client POC',
            contactNumber: uniqueIntegrationPhone(token),
            email: `good-${token}@grubpac.local`,
            isPrimary: true,
          },
        ],
      })
      .expect((res) => expect([200, 201]).toContain(res.status));
    const goodFleetId = (goodCreate.body as FleetClientResponse).id;

    const orgCreate = await request(app.getHttpServer())
      .post('/api/v1/organisation/clients')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        clientName: `Broken sync ${token}`,
        addressLine1: 'Line 1',
        addressCountry: 'IN',
        addressState: 'Maharashtra',
        addressDistrict: 'Mumbai',
        addressPincode: '400001',
        pointsOfContact: [
          {
            name: 'Broken Sync POC',
            contactNumber: uniqueIntegrationPhone(`broken-sync-${token}`),
            email: `broken-sync-${token}@grubpac.local`,
            isPrimary: true,
          },
        ],
      })
      .expect((res) => expect([200, 201]).toContain(res.status));

    const orgClientId = (orgCreate.body as { id: string }).id;
    const linkedFleetId = (orgCreate.body as { linkedFleetClientId?: string })
      .linkedFleetClientId;
    expect(linkedFleetId).toBeTruthy();
    await db.delete(fleetClients).where(eq(fleetClients.id, linkedFleetId!));

    const fleetClientsService = app.get(FleetClientsService);
    const syncOriginal =
      fleetClientsService.syncFromOrganisationClient.bind(fleetClientsService);
    const syncSpy = jest
      .spyOn(fleetClientsService, 'syncFromOrganisationClient')
      .mockImplementation(async (orgId, clientId, options) => {
        if (clientId === orgClientId) {
          throw new BadRequestException('Could not create fleet client link');
        }
        return syncOriginal(orgId, clientId, options);
      });

    try {
      const list = await request(app.getHttpServer())
        .get('/api/v1/fleet-leasing/clients')
        .query({ organizationId, search: token, page: 1, pageSize: 50 })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);
      const body = list.body as PaginatedClientsResponse;
      expect(body.items.some((row) => row.id === goodFleetId)).toBe(true);
      expect(
        body.items.some((row) => row.companyName.includes('Broken sync')),
      ).toBe(false);
    } finally {
      syncSpy.mockRestore();
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

  it('LEASE-03: pool availability subtracts unallocated draft commitments', async () => {
    const unique = Date.now();
    const { assetClassName: assetClass, assetClassId: classId } =
      await seedAssetRegisterClassWithVehicle('Pool', unique);

    await request(app.getHttpServer())
      .post('/api/v1/asset-register/vehicles')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        assetClassId: classId,
        registrationNumber: `AR-POOL2-${unique}`.slice(0, 32),
        chassisNumber: `CH-POOL2-${unique}`,
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

    const clientRes = await request(app.getHttpServer())
      .post('/api/v1/fleet-leasing/clients')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        companyName: `Pool Client ${unique}`,
        ...fleetClientStructuredAddressIn(),
        pointsOfContact: [
          {
            name: 'POC Pool',
            contactNumber: uniqueIntegrationPhone(`pool-${unique}`),
            email: `pool-${unique}@example.com`,
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
    const draftId = (draftRes.body as { id: string }).id;

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
            ratePerVehicleMonth: '10000.00',
          },
        ],
      })
      .expect(200);

    const reservedPreview = await request(app.getHttpServer())
      .post('/api/v1/fleet-leasing/asset-classes/availability/preview')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        lines: [{ assetClass, committedQuantity: 2 }],
      })
      .expect(200);
    const reservedBody = reservedPreview.body as AssetAvailabilityBatchResponse;
    expect(reservedBody.lines[0].availableNow).toBe(1);
    expect(reservedBody.lines[0].mvpAvailableNowCovers).toBe(false);

    const selfPreview = await request(app.getHttpServer())
      .post('/api/v1/fleet-leasing/asset-classes/availability/preview')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        excludeContractId: draftId,
        lines: [{ assetClass, committedQuantity: 2 }],
      })
      .expect(200);
    const selfBody = selfPreview.body as AssetAvailabilityBatchResponse;
    expect(selfBody.lines[0].availableNow).toBe(2);
    expect(selfBody.lines[0].mvpAvailableNowCovers).toBe(true);
  });

  it('rejects duplicate asset class on PUT asset-lines', async () => {
    const unique = Date.now();
    const { assetClassName: assetClass } =
      await seedAssetRegisterClassWithVehicle('Sedan', unique + 90210);

    const draft = await createDraftLeaseContract(app, {
      organizationId,
      token: accessToken,
      ensureClient: true,
      clientLabel: 'DupAssetLine',
    });
    const draftId = draft.id;

    const dupRes = await request(app.getHttpServer())
      .put(`/api/v1/fleet-leasing/lease-contracts/${draftId}/asset-lines`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        assetLines: [
          {
            assetClass,
            committedQuantity: 1,
            ratePerVehicleMonth: '10000.00',
          },
          {
            assetClass: assetClass.toUpperCase(),
            committedQuantity: 2,
            ratePerVehicleMonth: '10000.00',
          },
        ],
      })
      .expect(400);
    const dupBody = dupRes.body as { message?: string };
    expect(String(dupBody.message)).toContain(
      'Each asset class may only appear once',
    );
  });

  async function seedAssetRegisterClassWithVehicle(
    modelName: string,
    unique: number,
  ): Promise<{
    assetClassName: string;
    assetClassId: string;
    registrationNumber: string;
    assetRegisterFleetCode: string;
  }> {
    const classRes = await request(app.getHttpServer())
      .post('/api/v1/asset-register/asset-classes')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        brand: 'Test',
        modelName,
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
        fuelTankCapacity: 10,
        ratedLoadFrom: 500,
        ratedLoadTo: 1500,
        intakeChecklistItems: ['Registration papers'],
      })
      .expect((res) => expect([200, 201]).toContain(res.status));
    const classBody = classRes.body as { id: string; name: string };
    const classId = classBody.id;
    const assetClassName = classBody.name;

    const registrationNumber = `AR-L05-${unique}`.slice(0, 32);
    const vehicleRegisterRes = await request(app.getHttpServer())
      .post('/api/v1/asset-register/vehicles')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        assetClassId: classId,
        registrationNumber,
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
    const assetRegisterFleetCode = (
      vehicleRegisterRes.body as { fleetCode: string }
    ).fleetCode;

    return {
      assetClassName,
      assetClassId: classId,
      registrationNumber,
      assetRegisterFleetCode,
    };
  }

  function allPassReturnInspectionSections() {
    const markPass = (key: string) => ({ [key]: { rating: 'pass' } });
    return {
      documents_keys: {
        ...markPass('rc_book'),
        ...markPass('insurance'),
        ...markPass('puc'),
        ...markPass('keys_set'),
      },
      glass_mirrors_lights: {
        ...markPass('windshield'),
        ...markPass('side_mirrors'),
        ...markPass('headlamps'),
        ...markPass('tail_lamps'),
      },
      exterior_body: {
        ...markPass('front_bumper'),
        ...markPass('left_rear_door'),
        ...markPass('right_side_panel'),
        ...markPass('roof'),
        ...markPass('paint_overall'),
        ...markPass('rear_bumper_tow_hook'),
      },
      tyres_wheels: {
        ...markPass('front_tyres'),
        ...markPass('rear_tyres'),
        ...markPass('spare_wheel'),
      },
      interior_cabin: {
        ...markPass('seats'),
        ...markPass('dashboard'),
        ...markPass('ac_blower'),
      },
      cargo_box: {
        ...markPass('load_body'),
        ...markPass('tailgate'),
      },
      engine_fluids: {
        ...markPass('engine_oil'),
        ...markPass('coolant'),
        ...markPass('leaks'),
      },
      brakes_suspension: {
        ...markPass('brake_pedal'),
        ...markPass('handbrake'),
        ...markPass('suspension_noise'),
      },
      electricals_battery: {
        ...markPass('battery'),
        ...markPass('horn'),
        ...markPass('wiring'),
      },
      branding_accessories: {
        ...markPass('client_branding'),
        ...markPass('toolkit'),
        ...markPass('gps_telematics'),
      },
    };
  }

  async function createReturnInspectionReadyToFinalize(
    label: string,
  ): Promise<{ inspectionId: string; clientId: string }> {
    const unique = Date.now() + Math.floor(Math.random() * 10_000);
    const { assetClassName: assetClass, registrationNumber } =
      await seedAssetRegisterClassWithVehicle(label, unique);

    const vehicleRes = await request(app.getHttpServer())
      .post('/api/v1/fleet-leasing/vehicles')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        vin: `VIN-${label}-${unique}`,
        registrationNo: registrationNumber,
        registrationExpiry: '2030-12-31',
        insuranceExpiry: '2030-12-31',
        assetClass,
        odometer: 50000,
      })
      .expect((res) => expect([200, 201]).toContain(res.status));
    const vehicleId = (vehicleRes.body as { id: string }).id;

    const clientId = await createFleetClientForIntegrationTest(
      app,
      organizationId,
      accessToken,
      `${label}-client`,
    );

    const draft = await createDraftLeaseContract(app, {
      organizationId,
      token: accessToken,
      clientId,
    });

    await request(app.getHttpServer())
      .put(`/api/v1/fleet-leasing/lease-contracts/${draft.id}/asset-lines`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        assetLines: [
          {
            assetClass,
            committedQuantity: 1,
            ratePerVehicleMonth: '20000.00',
          },
        ],
      })
      .expect(200);

    await request(app.getHttpServer())
      .put(`/api/v1/fleet-leasing/lease-contracts/${draft.id}/terms`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        startDate: '2026-01-01',
        termMonths: 12,
        securityDeposit: '10000.00',
        billingFrequency: 'monthly',
      })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/fleet-leasing/lease-contracts/${draft.id}/confirm`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect((res) => expect([200, 201]).toContain(res.status));

    await request(app.getHttpServer())
      .post(
        `/api/v1/fleet-leasing/lease-contracts/${draft.id}/vehicle-allocations`,
      )
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        vehicleId,
        notifiedStakeholders: [DEV_ADMIN_EMAIL],
      })
      .expect((res) => expect([200, 201]).toContain(res.status));

    await request(app.getHttpServer())
      .post(
        `/api/v1/fleet-leasing/lease-contracts/${draft.id}/initiate-returns`,
      )
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        closingReason: 'completed',
        leaseEndDate: '2026-10-31',
        vehicleIds: [vehicleId],
        returnMethod: 'client_depot',
        returnDepotLabel: 'Depot',
        expectedReturnBy: '2026-10-31',
      })
      .expect((res) => expect([200, 201]).toContain(res.status));

    const returnsRes = await request(app.getHttpServer())
      .get('/api/v1/fleet-leasing/returns')
      .query({ organizationId, contractId: draft.id, page: 1, pageSize: 5 })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
    const inspectionId = (returnsRes.body as { items: Array<{ id: string }> })
      .items[0]?.id;
    expect(inspectionId).toBeTruthy();

    await request(app.getHttpServer())
      .post(`/api/v1/fleet-leasing/returns/${inspectionId}/receive`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        receivedAt: '2026-10-31T10:00:00.000Z',
        broughtInBy: 'Driver',
        odometerReading: 50100,
        fuelLevel: 'half',
        keysReceived: 1,
        documentsChecklist: {
          rcBook: true,
          insuranceCopy: true,
          pucCertificate: true,
          goodsPermit: true,
        },
        gatePhotos: [
          {
            slot: 'front',
            capturedAt: '2026-10-31T10:01:00.000Z',
          },
        ],
        conditionAtGlance: 'looks_fine',
        inspectImmediately: false,
      })
      .expect((res) => expect([200, 201]).toContain(res.status));

    await request(app.getHttpServer())
      .patch(`/api/v1/fleet-leasing/returns/${inspectionId}/inspection`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        currentSectionIndex: 9,
        complete: true,
        sections: allPassReturnInspectionSections(),
      })
      .expect((res) => expect([200, 201]).toContain(res.status));

    return { inspectionId, clientId };
  }

  it('LEASE-05: stepwise draft confirm activates contract (MVP)', async () => {
    const unique = Date.now();
    const { assetClassName: assetClass } =
      await seedAssetRegisterClassWithVehicle('Sedan', unique);

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
        ...fleetClientStructuredAddressIn(),
        pointsOfContact: [
          {
            name: 'POC LEASE05',
            contactNumber: uniqueIntegrationPhone(`lease05-${unique}`),
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

    const termsRes = await request(app.getHttpServer())
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
    const termsBody = termsRes.body as {
      contract: { endDate?: string | null };
    };
    expect(termsBody.contract.endDate).toBe('2028-01-12');

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

    const { assetClassName: secondClass } =
      await seedAssetRegisterClassWithVehicle(
        `Lease05Suv${unique}`,
        unique + 1,
      );

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
          {
            assetClass: secondClass,
            committedQuantity: 1,
            ratePerVehicleMonth: '36000.00',
          },
        ],
        confirmShortfall: false,
      })
      .expect(200);

    const afterEdit = await request(app.getHttpServer())
      .get(`/api/v1/fleet-leasing/lease-contracts/${draftBody.id}`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
    const afterEditBody = afterEdit.body as LeaseContractDetailResponse;
    expect(afterEditBody.rawStatus).toBe('active');
    expect(afterEditBody.assetLines).toHaveLength(2);
    expect(afterEditBody.hasFieldChangeHistory).toBe(true);
    expect(afterEditBody.requiresEditReview).toBe(true);
  });

  it('LEASE-05: confirm activates draft with non-standard rates (MVP)', async () => {
    const unique = Date.now();
    const { assetClassName: assetClass } =
      await seedAssetRegisterClassWithVehicle('Sedan', unique);

    const clientRes = await request(app.getHttpServer())
      .post('/api/v1/fleet-leasing/clients')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        companyName: `LEASE05 Rate ${unique}`,
        ...fleetClientStructuredAddressIn(),
        pointsOfContact: [
          {
            name: 'POC',
            contactNumber: uniqueIntegrationPhone(`lease05-rate-${unique}`),
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
        ...fleetClientStructuredAddressIn(),
        pointsOfContact: [
          {
            name: 'POC LEASE06 History',
            contactNumber: uniqueIntegrationPhone(
              `lease06-history-${historyClientSuffix}`,
            ),
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

    await request(app.getHttpServer())
      .patch(`/api/v1/fleet-leasing/lease-contracts/${draftId}`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        startDate: '2026-01-01',
        termMonths: 12,
        securityDeposit: '10000.00',
        billingFrequency: 'monthly',
      })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/v1/fleet-leasing/lease-contracts/${draftId}`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        startDate: '2026-02-01',
        termMonths: 24,
        securityDeposit: '20000.00',
        billingFrequency: 'quarterly',
        editClassification: 'material',
      })
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
    const termsStartRow = historyBody.items.find(
      (row) => row.field === 'startDate',
    );
    const termsMonthsRow = historyBody.items.find(
      (row) => row.field === 'termMonths',
    );
    expect(termsStartRow?.fromValue).not.toBe('—');
    expect(termsStartRow?.toValue).not.toBe('—');
    expect(termsMonthsRow?.fromValue).toBe('12');
    expect(termsMonthsRow?.toValue).toBe('24');
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
        ...fleetClientStructuredAddressIn(),
        pointsOfContact: [
          {
            name: 'Term POC',
            contactNumber: uniqueIntegrationPhone(`lease06-term-${unique}`),
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

  it('LEASE-09: initiate returns moves contract to closing and vehicles to return_pending', async () => {
    const unique = Date.now();
    const {
      assetClassName: assetClass,
      registrationNumber,
      assetRegisterFleetCode,
    } = await seedAssetRegisterClassWithVehicle('EndLease', unique);

    const vehicleRes = await request(app.getHttpServer())
      .post('/api/v1/fleet-leasing/vehicles')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        vin: `VIN-END-${unique}`,
        registrationNo: registrationNumber,
        registrationExpiry: '2030-12-31',
        insuranceExpiry: '2030-12-31',
        assetClass,
        odometer: 61950,
      })
      .expect((res) => expect([200, 201]).toContain(res.status));
    const vehicleId = (vehicleRes.body as { id: string }).id;

    const clientRes = await request(app.getHttpServer())
      .post('/api/v1/fleet-leasing/clients')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        companyName: `EndLease Client ${unique}`,
        ...fleetClientStructuredAddressIn(),
        pointsOfContact: [
          {
            name: 'POC End',
            contactNumber: uniqueIntegrationPhone(`end-${unique}`),
            email: `end-${unique}@example.com`,
            isPrimary: true,
          },
        ],
      })
      .expect((res) => expect([200, 201]).toContain(res.status));
    const clientId = (clientRes.body as FleetClientResponse).id;

    const draft = await createDraftLeaseContract(app, {
      organizationId,
      token: accessToken,
      clientId,
    });

    await request(app.getHttpServer())
      .put(`/api/v1/fleet-leasing/lease-contracts/${draft.id}/asset-lines`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        assetLines: [
          {
            assetClass,
            committedQuantity: 1,
            ratePerVehicleMonth: '25000.00',
          },
        ],
      })
      .expect(200);

    await request(app.getHttpServer())
      .put(`/api/v1/fleet-leasing/lease-contracts/${draft.id}/terms`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        startDate: '2026-01-01',
        termMonths: 12,
        securityDeposit: '40000.00',
        billingFrequency: 'monthly',
      })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/fleet-leasing/lease-contracts/${draft.id}/confirm`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect((res) => expect([200, 201]).toContain(res.status));

    await request(app.getHttpServer())
      .post(
        `/api/v1/fleet-leasing/lease-contracts/${draft.id}/vehicle-allocations`,
      )
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        vehicleId,
        notifiedStakeholders: [DEV_ADMIN_EMAIL],
      })
      .expect((res) => expect([200, 201]).toContain(res.status));

    const initiateRes = await request(app.getHttpServer())
      .post(
        `/api/v1/fleet-leasing/lease-contracts/${draft.id}/initiate-returns`,
      )
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        closingReason: 'completed',
        leaseEndDate: '2026-10-31',
        vehicleIds: [vehicleId],
        returnMethod: 'client_depot',
        returnDepotLabel: 'Gurugram depot',
        expectedReturnBy: '2026-10-31',
        notes: 'Batch return',
      })
      .expect((res) => expect([200, 201]).toContain(res.status));

    const detail = initiateRes.body as LeaseContractDetailResponse;
    expect(detail.rawStatus).toBe('pending_termination');
    expect(detail.status).toBe('Closing');
    expect(detail.closing?.reason).toBe('completed');
    expect(detail.availableActions.terminate?.allowed).toBe(true);

    await expectAuditLog(db, {
      organizationId,
      action: 'lease_contract.initiate_returns',
      resourceId: draft.id,
    });

    const returnsList = await request(app.getHttpServer())
      .get('/api/v1/fleet-leasing/returns')
      .query({ organizationId, contractId: draft.id })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
    const returnsBody = returnsList.body as {
      items: Array<{
        vehicleStatus: string;
        registeredReturn: boolean;
        registrationNo: string;
        fleetCode: string;
        nextSteps: Array<{
          actionKey: string;
          label: string;
          variant: string;
          enabled: boolean;
          reasonDisabled?: string;
        }>;
      }>;
    };
    expect(returnsBody.items.length).toBeGreaterThanOrEqual(1);
    expect(returnsBody.items[0]?.vehicleStatus).toBe('return_pending');
    expect(returnsBody.items[0]?.registeredReturn).toBe(false);
    expect(returnsBody.items[0]?.registrationNo).toBe(registrationNumber);
    expect(returnsBody.items[0]?.fleetCode).toBe(assetRegisterFleetCode);
    expect(returnsBody.items[0]?.nextSteps?.length).toBeGreaterThanOrEqual(1);
    expect(returnsBody.items[0]?.nextSteps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actionKey: 'receive',
          label: 'Receive',
          variant: 'secondary',
          enabled: true,
        }),
      ]),
    );
    expect(
      returnsBody.items[0]?.nextSteps?.some(
        (s) => s.actionKey === 'remind_client',
      ),
    ).toBe(false);

    const expectedTabList = await request(app.getHttpServer())
      .get('/api/v1/fleet-leasing/returns')
      .query({
        organizationId,
        pipelineTab: 'expected',
        includeTabCounts: 'true',
        page: 1,
        pageSize: 10,
      })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
    const expectedTabBody = expectedTabList.body as {
      items: Array<{ id: string }>;
      total: number;
      tabCounts: Record<string, number>;
    };
    expect(expectedTabBody.items.length).toBeGreaterThanOrEqual(1);
    expect(expectedTabBody.tabCounts?.expected).toBeGreaterThanOrEqual(1);
    expect(expectedTabBody.total).toBe(expectedTabBody.tabCounts?.expected);

    const pipelineTabs = [
      'all_open',
      'expected',
      'overdue',
      'to_inspect',
      'in_inspection',
      'workshop',
      'closed',
    ] as const;
    for (const pipelineTab of pipelineTabs) {
      const tabRes = await request(app.getHttpServer())
        .get('/api/v1/fleet-leasing/returns')
        .query({
          organizationId,
          contractId: draft.id,
          pipelineTab,
          includeTabCounts: 'true',
          page: 1,
          pageSize: 50,
        })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);
      const tabBody = tabRes.body as {
        total: number;
        tabCounts: Record<string, number>;
      };
      expect(tabBody.total).toBe(tabBody.tabCounts?.[pipelineTab] ?? -1);
    }

    const depotTabRes = await request(app.getHttpServer())
      .get('/api/v1/fleet-leasing/returns')
      .query({
        organizationId,
        contractId: draft.id,
        pipelineTab: 'expected',
        returnDepotLabel: 'Gurugram depot',
        includeTabCounts: 'true',
        page: 1,
        pageSize: 50,
      })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
    const depotTabBody = depotTabRes.body as {
      total: number;
      tabCounts: Record<string, number>;
    };
    expect(depotTabBody.total).toBe(depotTabBody.tabCounts?.expected);

    const reasonTabRes = await request(app.getHttpServer())
      .get('/api/v1/fleet-leasing/returns')
      .query({
        organizationId,
        contractId: draft.id,
        closingReason: 'completed',
        pipelineTab: 'expected',
        includeTabCounts: 'true',
        page: 1,
        pageSize: 50,
      })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
    const reasonTabBody = reasonTabRes.body as {
      total: number;
      tabCounts: Record<string, number>;
    };
    expect(reasonTabBody.total).toBe(reasonTabBody.tabCounts?.expected);

    const searchTabRes = await request(app.getHttpServer())
      .get('/api/v1/fleet-leasing/returns')
      .query({
        organizationId,
        contractId: draft.id,
        pipelineTab: 'expected',
        search: registrationNumber,
        includeTabCounts: 'true',
        page: 1,
        pageSize: 50,
      })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
    const searchTabBody = searchTabRes.body as {
      items: unknown[];
      total: number;
      tabCounts: Record<string, number>;
    };
    expect(searchTabBody.items.length).toBeGreaterThanOrEqual(1);
    expect(searchTabBody.total).toBe(searchTabBody.tabCounts?.expected);

    await request(app.getHttpServer())
      .get('/api/v1/fleet-leasing/returns')
      .query({
        organizationId,
        pipelineTab: 'not_a_pipeline_tab',
        page: 1,
        pageSize: 10,
      })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(400);

    const depotFiltered = await request(app.getHttpServer())
      .get('/api/v1/fleet-leasing/returns')
      .query({
        organizationId,
        contractId: draft.id,
        returnDepotLabel: 'Gurugram depot',
        page: 1,
        pageSize: 10,
      })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
    expect(
      (depotFiltered.body as { items: unknown[] }).items.length,
    ).toBeGreaterThanOrEqual(1);

    const reasonFiltered = await request(app.getHttpServer())
      .get('/api/v1/fleet-leasing/returns')
      .query({
        organizationId,
        contractId: draft.id,
        closingReason: 'completed',
        page: 1,
        pageSize: 10,
      })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
    expect(
      (reasonFiltered.body as { items: unknown[] }).items.length,
    ).toBeGreaterThanOrEqual(1);

    const terminatedReasonOnCompleted = await request(app.getHttpServer())
      .get('/api/v1/fleet-leasing/returns')
      .query({
        organizationId,
        contractId: draft.id,
        closingReason: 'terminated_early',
        page: 1,
        pageSize: 10,
      })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
    expect(
      (terminatedReasonOnCompleted.body as { items: unknown[] }).items.length,
    ).toBe(0);

    const allOpenWithCompletedReason = await request(app.getHttpServer())
      .get('/api/v1/fleet-leasing/returns')
      .query({
        organizationId,
        contractId: draft.id,
        pipelineTab: 'all_open',
        closingReason: 'completed',
        page: 1,
        pageSize: 10,
      })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
    expect(
      (allOpenWithCompletedReason.body as { items: unknown[] }).items.length,
    ).toBeGreaterThanOrEqual(1);

    await request(app.getHttpServer())
      .get('/api/v1/fleet-leasing/returns')
      .query({
        organizationId,
        closingReason: 'not_a_closing_reason',
        page: 1,
        pageSize: 10,
      })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(400);

    const withFilterOptions = await request(app.getHttpServer())
      .get('/api/v1/fleet-leasing/returns')
      .query({
        organizationId,
        includeTabCounts: 'true',
        page: 1,
        pageSize: 5,
      })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
    const filterBody = withFilterOptions.body as {
      depotFilterOptions?: Array<{ label: string; value: string }>;
    };
    expect(filterBody.depotFilterOptions?.length).toBeGreaterThanOrEqual(1);

    const inspectionId = (returnsBody.items as Array<{ id: string }>)[0]?.id;
    expect(inspectionId).toBeTruthy();

    const receiveRes = await request(app.getHttpServer())
      .post(`/api/v1/fleet-leasing/returns/${inspectionId}/receive`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        receivedAt: '2026-10-31T10:40:00.000Z',
        broughtInBy: 'Client driver · Vikas',
        odometerReading: 64540,
        fuelLevel: 'quarter',
        keysReceived: 1,
        documentsChecklist: {
          rcBook: true,
          insuranceCopy: true,
          pucCertificate: true,
          goodsPermit: true,
        },
        gatePhotos: [
          {
            slot: 'front',
            capturedAt: '2026-10-31T10:42:00.000Z',
            label: 'Front',
          },
          {
            slot: 'rear',
            capturedAt: '2026-10-31T10:42:00.000Z',
            label: 'Rear',
          },
        ],
        conditionAtGlance: 'visible_damage',
        gateNote: 'Front bumper cracked',
        inspectImmediately: false,
      })
      .expect((res) => expect([200, 201]).toContain(res.status));

    const received = receiveRes.body as {
      registeredReturn: boolean;
      vehicleStatus: string;
      odometerReading: number;
    };
    expect(received.registeredReturn).toBe(true);
    expect(received.vehicleStatus).toBe('returned');
    expect(received.odometerReading).toBe(64540);

    const afterReceiveList = await request(app.getHttpServer())
      .get('/api/v1/fleet-leasing/returns')
      .query({ organizationId, contractId: draft.id })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
    const afterReceiveItem = (
      afterReceiveList.body as {
        items: Array<{
          id: string;
          nextSteps: Array<{ actionKey: string; enabled: boolean }>;
        }>;
      }
    ).items.find((i) => i.id === inspectionId);
    expect(afterReceiveItem?.nextSteps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actionKey: 'start_inspection',
          enabled: true,
        }),
      ]),
    );

    await expectAuditLog(db, {
      organizationId,
      action: 'fleet_return.receive',
      resourceId: inspectionId,
    });

    const draftSaveRes = await request(app.getHttpServer())
      .patch(`/api/v1/fleet-leasing/returns/${inspectionId}/inspection`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        currentSectionIndex: 2,
        sections: {
          exterior_body: {
            front_bumper: {
              rating: 'major',
              attribution: 'client_damage',
              note: 'Front bumper cracked and misaligned',
              repairCostMinor: 12_000_00,
            },
            left_rear_door: {
              rating: 'minor',
              attribution: 'client_damage',
              note: 'Door ding near handle',
              repairCostMinor: 4_500_00,
            },
          },
        },
      })
      .expect((res) => expect([200, 201]).toContain(res.status));

    const draftSaved = draftSaveRes.body as {
      inspectionSummary: {
        majorCount: number;
        minorCount: number;
        repairEstimateMinor: number;
      };
    };
    expect(draftSaved.inspectionSummary.majorCount).toBe(1);
    expect(draftSaved.inspectionSummary.minorCount).toBe(1);
    expect(draftSaved.inspectionSummary.repairEstimateMinor).toBe(16_500_00);

    await request(app.getHttpServer())
      .patch(`/api/v1/fleet-leasing/returns/${inspectionId}/inspection`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        currentSectionIndex: 2,
        sections: {
          exterior_body: {
            front_bumper: {
              rating: 'major',
              attribution: 'client_damage',
              repairCostMinor: 12_000_00,
            },
          },
        },
      })
      .expect(400);

    const detailAfterDraft = await request(app.getHttpServer())
      .get(`/api/v1/fleet-leasing/returns/${inspectionId}`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
    expect(
      (detailAfterDraft.body as { inspectionSummary: { majorCount: number } })
        .inspectionSummary.majorCount,
    ).toBe(1);

    const markPass = (key: string) => ({ [key]: { rating: 'pass' } });
    const inspectionCompleteRes = await request(app.getHttpServer())
      .patch(`/api/v1/fleet-leasing/returns/${inspectionId}/inspection`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        currentSectionIndex: 9,
        complete: true,
        sections: {
          documents_keys: {
            ...markPass('rc_book'),
            ...markPass('insurance'),
            ...markPass('puc'),
            ...markPass('keys_set'),
          },
          glass_mirrors_lights: {
            ...markPass('windshield'),
            ...markPass('side_mirrors'),
            ...markPass('headlamps'),
            ...markPass('tail_lamps'),
          },
          exterior_body: {
            ...markPass('front_bumper'),
            ...markPass('left_rear_door'),
            ...markPass('right_side_panel'),
            ...markPass('roof'),
            ...markPass('paint_overall'),
            ...markPass('rear_bumper_tow_hook'),
          },
          tyres_wheels: {
            ...markPass('front_tyres'),
            ...markPass('rear_tyres'),
            ...markPass('spare_wheel'),
          },
          interior_cabin: {
            ...markPass('seats'),
            ...markPass('dashboard'),
            ...markPass('ac_blower'),
          },
          cargo_box: {
            ...markPass('load_body'),
            ...markPass('tailgate'),
          },
          engine_fluids: {
            ...markPass('engine_oil'),
            ...markPass('coolant'),
            ...markPass('leaks'),
          },
          brakes_suspension: {
            ...markPass('brake_pedal'),
            ...markPass('handbrake'),
            ...markPass('suspension_noise'),
          },
          electricals_battery: {
            ...markPass('battery'),
            ...markPass('horn'),
            ...markPass('wiring'),
          },
          branding_accessories: {
            ...markPass('client_branding'),
            ...markPass('toolkit'),
            ...markPass('gps_telematics'),
          },
        },
      })
      .expect((res) => expect([200, 201]).toContain(res.status));

    const readyToFinalize = inspectionCompleteRes.body as {
      inspectionStatus: string;
      vehicleStatus: string;
      inspectionResult?: unknown;
    };
    expect(readyToFinalize.inspectionStatus).toBe('ready_to_finalize');
    expect(readyToFinalize.vehicleStatus).toBe('returned');
    expect(readyToFinalize.inspectionResult).toBeFalsy();

    await expectAuditLog(db, {
      organizationId,
      action: 'fleet_return.ready_to_finalize_inspection',
      resourceId: inspectionId,
    });

    const finalizeRes = await request(app.getHttpServer())
      .post(`/api/v1/fleet-leasing/returns/${inspectionId}/inspection/finalize`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        disposition: 'ready_to_lease',
        waiveAllRecovery: false,
        inspectorConfirmed: true,
      })
      .expect((res) => expect([200, 201]).toContain(res.status));

    const completed = finalizeRes.body as {
      inspectionStatus: string;
      vehicleStatus: string;
      inspectionResult?: {
        outcome: string;
        recoveryNote: { totalMinor: number };
      };
    };
    expect(completed.inspectionStatus).toBe('completed');
    expect(completed.vehicleStatus).toBe('available');
    expect(completed.inspectionResult?.outcome).toBe('ready_to_lease');

    const reasonOnlyAfterRelease = await request(app.getHttpServer())
      .get('/api/v1/fleet-leasing/returns')
      .query({
        organizationId,
        contractId: draft.id,
        closingReason: 'completed',
        page: 1,
        pageSize: 10,
      })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
    expect(
      (reasonOnlyAfterRelease.body as { items: unknown[] }).items.length,
    ).toBeGreaterThanOrEqual(1);

    const allOpenAfterReleaseWithReason = await request(app.getHttpServer())
      .get('/api/v1/fleet-leasing/returns')
      .query({
        organizationId,
        contractId: draft.id,
        pipelineTab: 'all_open',
        closingReason: 'completed',
        page: 1,
        pageSize: 10,
      })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
    expect(
      (allOpenAfterReleaseWithReason.body as { items: unknown[] }).items.length,
    ).toBe(0);

    const closedTabAfterRelease = await request(app.getHttpServer())
      .get('/api/v1/fleet-leasing/returns')
      .query({
        organizationId,
        contractId: draft.id,
        pipelineTab: 'closed',
        closingReason: 'completed',
        page: 1,
        pageSize: 10,
      })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
    expect(
      (closedTabAfterRelease.body as { items: unknown[] }).items.length,
    ).toBeGreaterThanOrEqual(1);

    await expectAuditLog(db, {
      organizationId,
      action: 'fleet_return.complete_inspection',
      resourceId: inspectionId,
    });
  });

  it('LEASE-09-REASON: terminated_early closing reason lists return_pending rows', async () => {
    const unique = Date.now() + 7;
    const { assetClassName: assetClass, registrationNumber } =
      await seedAssetRegisterClassWithVehicle('TermEarly', unique);

    const vehicleRes = await request(app.getHttpServer())
      .post('/api/v1/fleet-leasing/vehicles')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        vin: `VIN-TE-${unique}`,
        registrationNo: registrationNumber,
        registrationExpiry: '2030-12-31',
        insuranceExpiry: '2030-12-31',
        assetClass,
        odometer: 5000,
      })
      .expect((res) => expect([200, 201]).toContain(res.status));
    const vehicleId = (vehicleRes.body as { id: string }).id;

    const clientRes = await request(app.getHttpServer())
      .post('/api/v1/fleet-leasing/clients')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        companyName: `Term Early Client ${unique}`,
        ...fleetClientStructuredAddressIn(),
        pointsOfContact: [
          {
            name: 'POC TE',
            contactNumber: uniqueIntegrationPhone(`te-${unique}`),
            email: `te-${unique}@example.com`,
            isPrimary: true,
          },
        ],
      })
      .expect((res) => expect([200, 201]).toContain(res.status));
    const clientId = (clientRes.body as FleetClientResponse).id;

    const draft = await createDraftLeaseContract(app, {
      organizationId,
      token: accessToken,
      clientId,
    });

    await request(app.getHttpServer())
      .put(`/api/v1/fleet-leasing/lease-contracts/${draft.id}/asset-lines`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        assetLines: [
          {
            assetClass,
            committedQuantity: 1,
            ratePerVehicleMonth: '25000.00',
          },
        ],
      })
      .expect(200);

    await request(app.getHttpServer())
      .put(`/api/v1/fleet-leasing/lease-contracts/${draft.id}/terms`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        startDate: '2026-01-01',
        termMonths: 12,
        securityDeposit: '40000.00',
        billingFrequency: 'monthly',
      })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/fleet-leasing/lease-contracts/${draft.id}/confirm`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect((res) => expect([200, 201]).toContain(res.status));

    await request(app.getHttpServer())
      .post(
        `/api/v1/fleet-leasing/lease-contracts/${draft.id}/vehicle-allocations`,
      )
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        vehicleId,
        notifiedStakeholders: [DEV_ADMIN_EMAIL],
      })
      .expect((res) => expect([200, 201]).toContain(res.status));

    await db
      .update(schema.leaseContracts)
      .set({ status: 'deactivated', onHold: true })
      .where(eq(schema.leaseContracts.id, draft.id));

    await request(app.getHttpServer())
      .post(
        `/api/v1/fleet-leasing/lease-contracts/${draft.id}/initiate-returns`,
      )
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        closingReason: 'terminated_early',
        leaseEndDate: '2026-10-31',
        vehicleIds: [vehicleId],
        returnMethod: 'client_depot',
        returnDepotLabel: 'Term depot',
        expectedReturnBy: '2026-11-15',
      })
      .expect((res) => expect([200, 201]).toContain(res.status));

    const terminatedReasonList = await request(app.getHttpServer())
      .get('/api/v1/fleet-leasing/returns')
      .query({
        organizationId,
        contractId: draft.id,
        closingReason: 'terminated_early',
        page: 1,
        pageSize: 10,
      })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
    const terminatedItems = (
      terminatedReasonList.body as {
        items: Array<{ contractClosingReason: string | null }>;
      }
    ).items;
    expect(terminatedItems.length).toBeGreaterThanOrEqual(1);
    expect(terminatedItems[0]?.contractClosingReason).toBe('terminated_early');
  });

  it('LEASE-09-ALLOC: initiate returns accepts allocation row without lease_contract_vehicles link', async () => {
    const unique = Date.now();
    const expiry = new Date('2028-12-31T00:00:00.000Z');
    const [vehicle] = await db
      .insert(fleetVehicles)
      .values({
        organizationId,
        vin: `VIN-ALLOC-ONLY-${unique}`,
        registrationNo: `VH-ALLOC-${unique}`,
        registrationExpiry: expiry,
        insuranceExpiry: expiry,
        assetClass: 'Van — Integration',
        status: 'leased',
        odometer: 12000,
      })
      .returning();
    const [contract] = await db
      .insert(leaseContracts)
      .values({
        organizationId,
        contractNumber: `LC-ALLOC-ONLY-${unique}`,
        status: 'active',
        startDate: new Date('2026-01-01T00:00:00.000Z'),
        endDate: new Date('2027-12-31T00:00:00.000Z'),
        termMonths: 24,
      })
      .returning();
    await db.insert(fleetVehicleAllocations).values({
      organizationId,
      contractId: contract.id,
      vehicleId: vehicle.id,
    });

    const initiateRes = await request(app.getHttpServer())
      .post(
        `/api/v1/fleet-leasing/lease-contracts/${contract.id}/initiate-returns`,
      )
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        closingReason: 'completed',
        leaseEndDate: '2026-10-31',
        vehicleIds: [vehicle.id],
        returnMethod: 'collect_from_site',
        expectedReturnBy: '2026-11-05',
      })
      .expect((res) => expect([200, 201]).toContain(res.status));

    const detail = initiateRes.body as LeaseContractDetailResponse;
    expect(detail.rawStatus).toBe('pending_termination');
    expect(detail.status).toBe('Closing');

    await expectAuditLog(db, {
      organizationId,
      action: 'lease_contract.initiate_returns',
      resourceId: contract.id,
    });
  });

  it('LEASE-09b: inspection with major damage completes to workshop result (Screen 5)', async () => {
    const unique = Date.now() + 99;
    const { assetClassName: assetClass, registrationNumber } =
      await seedAssetRegisterClassWithVehicle('WorkshopResult', unique);

    const vehicleRes = await request(app.getHttpServer())
      .post('/api/v1/fleet-leasing/vehicles')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        vin: `VIN-WR-${unique}`,
        registrationNo: registrationNumber,
        registrationExpiry: '2030-12-31',
        insuranceExpiry: '2030-12-31',
        assetClass,
        odometer: 64400,
      })
      .expect((res) => expect([200, 201]).toContain(res.status));
    const vehicleId = (vehicleRes.body as { id: string }).id;

    const clientRes = await request(app.getHttpServer())
      .post('/api/v1/fleet-leasing/clients')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        companyName: `Workshop Result Client ${unique}`,
        ...fleetClientStructuredAddressIn(),
        pointsOfContact: [
          {
            name: 'POC WR',
            contactNumber: uniqueIntegrationPhone(`wr-${unique}`),
            email: `wr-${unique}@example.com`,
            isPrimary: true,
          },
        ],
      })
      .expect((res) => expect([200, 201]).toContain(res.status));
    const clientId = (clientRes.body as FleetClientResponse).id;

    const draft = await createDraftLeaseContract(app, {
      organizationId,
      token: accessToken,
      clientId,
    });
    const contractId = draft.id;

    await request(app.getHttpServer())
      .put(`/api/v1/fleet-leasing/lease-contracts/${contractId}/asset-lines`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        assetLines: [
          {
            assetClass,
            committedQuantity: 1,
            ratePerVehicleMonth: '25000.00',
          },
        ],
      })
      .expect(200);

    await request(app.getHttpServer())
      .put(`/api/v1/fleet-leasing/lease-contracts/${contractId}/terms`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        startDate: '2026-01-01',
        termMonths: 12,
        securityDeposit: '40000.00',
        billingFrequency: 'monthly',
      })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/fleet-leasing/lease-contracts/${contractId}/confirm`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect((res) => expect([200, 201]).toContain(res.status));

    await request(app.getHttpServer())
      .post(
        `/api/v1/fleet-leasing/lease-contracts/${contractId}/vehicle-allocations`,
      )
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        vehicleId,
        notifiedStakeholders: [DEV_ADMIN_EMAIL],
      })
      .expect((res) => expect([200, 201]).toContain(res.status));

    await request(app.getHttpServer())
      .post(
        `/api/v1/fleet-leasing/lease-contracts/${contractId}/initiate-returns`,
      )
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        closingReason: 'completed',
        leaseEndDate: '2026-10-24',
        vehicleIds: [vehicleId],
        returnMethod: 'client_depot',
        returnDepotLabel: 'Gurugram depot',
        expectedReturnBy: '2026-10-31',
        notes: 'Workshop result lattice',
      })
      .expect((res) => expect([200, 201]).toContain(res.status));

    const returnsRes = await request(app.getHttpServer())
      .get('/api/v1/fleet-leasing/returns')
      .query({ organizationId, contractId, page: 1, pageSize: 10 })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
    const inspectionId = (returnsRes.body as { items: Array<{ id: string }> })
      .items[0]?.id;
    expect(inspectionId).toBeTruthy();

    await request(app.getHttpServer())
      .post(`/api/v1/fleet-leasing/returns/${inspectionId}/receive`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        receivedAt: '2026-10-31T10:40:00.000Z',
        broughtInBy: 'Client driver',
        odometerReading: 67860,
        fuelLevel: 'half',
        keysReceived: 1,
        documentsChecklist: {
          rcBook: true,
          insuranceCopy: true,
          pucCertificate: true,
          goodsPermit: true,
        },
        gatePhotos: [
          {
            slot: 'front',
            capturedAt: '2026-10-31T10:42:00.000Z',
          },
        ],
        conditionAtGlance: 'visible_damage',
        inspectImmediately: false,
      })
      .expect((res) => expect([200, 201]).toContain(res.status));

    const markPass = (key: string) => ({ [key]: { rating: 'pass' } });
    const completeRes = await request(app.getHttpServer())
      .patch(`/api/v1/fleet-leasing/returns/${inspectionId}/inspection`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        currentSectionIndex: 9,
        complete: true,
        sections: {
          documents_keys: {
            ...markPass('rc_book'),
            ...markPass('insurance'),
            ...markPass('puc'),
            ...markPass('keys_set'),
          },
          glass_mirrors_lights: {
            ...markPass('windshield'),
            ...markPass('side_mirrors'),
            ...markPass('headlamps'),
            ...markPass('tail_lamps'),
          },
          exterior_body: {
            front_bumper: {
              rating: 'major',
              attribution: 'client_damage',
              note: 'Front bumper needs replacement',
              repairCostMinor: 1850000,
            },
            ...markPass('left_rear_door'),
            ...markPass('right_side_panel'),
            ...markPass('roof'),
            ...markPass('paint_overall'),
            ...markPass('rear_bumper_tow_hook'),
          },
          tyres_wheels: {
            ...markPass('front_tyres'),
            ...markPass('rear_tyres'),
            ...markPass('spare_wheel'),
          },
          interior_cabin: {
            ...markPass('seats'),
            ...markPass('dashboard'),
            ...markPass('ac_blower'),
          },
          cargo_box: {
            ...markPass('load_body'),
            ...markPass('tailgate'),
          },
          engine_fluids: {
            ...markPass('engine_oil'),
            ...markPass('coolant'),
            ...markPass('leaks'),
          },
          brakes_suspension: {
            ...markPass('brake_pedal'),
            ...markPass('handbrake'),
            ...markPass('suspension_noise'),
          },
          electricals_battery: {
            ...markPass('battery'),
            ...markPass('horn'),
            ...markPass('wiring'),
          },
          branding_accessories: {
            ...markPass('client_branding'),
            ...markPass('toolkit'),
            ...markPass('gps_telematics'),
          },
        },
      })
      .expect((res) => expect([200, 201]).toContain(res.status));

    const readyBody = completeRes.body as { inspectionStatus: string };
    expect(readyBody.inspectionStatus).toBe('ready_to_finalize');

    const finalizeRes = await request(app.getHttpServer())
      .post(`/api/v1/fleet-leasing/returns/${inspectionId}/inspection/finalize`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        disposition: 'send_to_workshop',
        inspectorConfirmed: true,
        issueCharges: [
          {
            sectionId: 'exterior_body',
            itemKey: 'front_bumper',
            chargeClient: true,
          },
        ],
        workshopPriority: 'normal',
      })
      .expect((res) => expect([200, 201]).toContain(res.status));

    const body = finalizeRes.body as {
      vehicleStatus: string;
      inspectionResult: {
        outcome: string;
        jobCard: {
          tasks: unknown[];
          displayNumber: string;
          workshopJobId: string | null;
        } | null;
        recoveryNote: { lines: unknown[]; totalMinor: number };
        availableActions: Array<{
          actionKey: string;
          enabled: boolean;
          workshopJobId?: string | null;
        }>;
      };
    };
    expect(body.vehicleStatus).toBe('workshop');
    expect(body.inspectionResult.outcome).toBe('sent_to_workshop');
    expect(body.inspectionResult.jobCard?.tasks.length).toBeGreaterThan(0);
    expect(body.inspectionResult.recoveryNote.totalMinor).toBeGreaterThan(0);
    expect(body.inspectionResult.recoveryNote.displayNumber).toMatch(
      /^BINV-\d{4}-\d{4}$/,
    );
    expect(body.inspectionResult.recoveryNote.financeInvoiceId).toEqual(
      expect.any(String),
    );
    expect(body.inspectionResult.recoveryNote.status).toBe(
      'waiting_for_finance',
    );
    const finalizeBody = finalizeRes.body as {
      financeRecoveryInvoiceId?: string | null;
    };
    expect(finalizeBody.financeRecoveryInvoiceId).toEqual(
      body.inspectionResult.recoveryNote.financeInvoiceId,
    );

    await expectAuditLog(db, {
      organizationId,
      action: 'finance.invoice.create',
      resourceId: body.inspectionResult.recoveryNote.financeInvoiceId as string,
    });

    const [fleetClientRow] = await db
      .select({ organisationClientId: fleetClients.organisationClientId })
      .from(fleetClients)
      .where(eq(fleetClients.id, clientId))
      .limit(1);
    expect(fleetClientRow?.organisationClientId).toEqual(expect.any(String));

    const statementRes = await request(app.getHttpServer())
      .get(
        `/api/v1/finance/client-statements/${fleetClientRow.organisationClientId}`,
      )
      .query({
        organizationId,
        periodStart: '2026-01-01',
        periodEnd: '2026-12-31',
        page: 1,
        pageSize: 10,
      })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
    expect(
      (statementRes.body as { billingInvoiceCount: number })
        .billingInvoiceCount,
    ).toBeGreaterThanOrEqual(1);

    expect(body.inspectionResult.jobCard?.workshopJobId).toEqual(
      expect.any(String),
    );
    expect(body.inspectionResult.jobCard?.displayNumber).toMatch(/^WO-/);
    const openWorkshop = body.inspectionResult.availableActions.find(
      (a) => a.actionKey === 'open_workshop',
    );
    expect(openWorkshop?.enabled).toBe(true);
    expect(openWorkshop?.workshopJobId).toEqual(
      body.inspectionResult.jobCard?.workshopJobId,
    );
    expect(
      body.inspectionResult.availableActions.some(
        (a) => a.actionKey === 'close_workshop_repair',
      ),
    ).toBe(false);

    const workshopJobId = body.inspectionResult.jobCard?.workshopJobId;
    expect(workshopJobId).toEqual(expect.any(String));

    await request(app.getHttpServer())
      .patch(`/api/v1/workshop/work-orders/${workshopJobId}/status`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({ action: 'close' })
      .expect(200);

    const afterWoClose = await request(app.getHttpServer())
      .get(`/api/v1/fleet-leasing/returns/${inspectionId}`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);

    const afterCloseBody = afterWoClose.body as {
      workshopRepairClosedAt: string | null;
      reInspection: { eligible: boolean };
      inspectionResult: {
        jobCard: { status: string } | null;
        timeline: Array<{ key: string; state: string }>;
      };
    };
    expect(afterCloseBody.workshopRepairClosedAt).toEqual(expect.any(String));
    expect(afterCloseBody.reInspection.eligible).toBe(true);
    expect(afterCloseBody.inspectionResult.jobCard?.status).toBe('closed');
    expect(
      afterCloseBody.inspectionResult.timeline.find((s) => s.key === 'workshop')
        ?.state,
    ).toBe('done');

    await expectAuditLog(db, {
      organizationId,
      action: 'fleet_return.close_workshop_repair',
      resourceId: inspectionId,
    });

    const openWorkshopAction = (
      finalizeRes.body as {
        inspectionResult: {
          availableActions: Array<{
            actionKey: string;
            enabled: boolean;
            workshopJobId?: string | null;
          }>;
        };
      }
    ).inspectionResult.availableActions.find(
      (a) => a.actionKey === 'open_workshop',
    );
    expect(openWorkshopAction?.enabled).toBe(true);
    expect(openWorkshopAction?.workshopJobId).toEqual(
      expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      ),
    );

    await request(app.getHttpServer())
      .post(`/api/v1/fleet-leasing/returns/${inspectionId}/re-inspection/start`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect((res) => expect([200, 201]).toContain(res.status));

    const reComplete = await request(app.getHttpServer())
      .patch(`/api/v1/fleet-leasing/returns/${inspectionId}/re-inspection`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        items: [
          {
            itemKey: 'exterior_body:front_bumper',
            sectionId: 'exterior_body',
            rating: 'pass',
          },
        ],
        poolChecklist: {
          roadTestDone: true,
          washedCleaned: true,
          fuelLevelChecked: true,
          insuranceValidAck: true,
          pucValidAck: true,
        },
        odometerAfterRoadTest: 67880,
        selectedOutcome: 'ready_to_lease',
        complete: true,
      })
      .expect((res) => expect([200, 201]).toContain(res.status));

    const reBody = reComplete.body as {
      vehicleStatus: string;
      assetRegisterVehicleId: string | null;
      reInspection: { status: string };
      inspectionResult: {
        outcome: string;
        assignmentPoolBanner: { contractsWaitingCount: number } | null;
        contractClosingProgress: {
          returnedCount: number;
          totalCount: number;
        } | null;
        timeline: Array<{ label: string; key: string }>;
        availableActions: Array<{
          actionKey: string;
          enabled: boolean;
        }>;
      };
    };
    expect(reBody.vehicleStatus).toBe('available');
    expect(reBody.reInspection.status).toBe('completed');
    expect(reBody.inspectionResult.outcome).toBe('ready_to_lease');
    expect(reBody.assetRegisterVehicleId).toEqual(expect.any(String));
    expect(
      reBody.inspectionResult.contractClosingProgress?.totalCount,
    ).toBeGreaterThanOrEqual(1);
    expect(
      reBody.inspectionResult.assignmentPoolBanner?.contractsWaitingCount,
    ).toEqual(expect.any(Number));
    expect(
      reBody.inspectionResult.timeline.some((s) =>
        s.label.includes('Re-inspected'),
      ),
    ).toBe(true);
    const assignAction = reBody.inspectionResult.availableActions.find(
      (a) => a.actionKey === 'assign_contract',
    );
    expect(assignAction?.enabled).toBe(true);

    await expectAuditLog(db, {
      organizationId,
      action: 'fleet_return.complete_re_inspection',
      resourceId: inspectionId,
    });
  });

  it('LEASE-09-HOLD: resolve hold reopens finalize then completes to available', async () => {
    const { inspectionId } =
      await createReturnInspectionReadyToFinalize('HoldResolve');

    const onHoldRes = await request(app.getHttpServer())
      .post(`/api/v1/fleet-leasing/returns/${inspectionId}/inspection/finalize`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        disposition: 'on_hold',
        waiveAllRecovery: true,
        inspectorConfirmed: true,
      })
      .expect((res) => expect([200, 201]).toContain(res.status));

    const onHoldBody = onHoldRes.body as {
      vehicleStatus: string;
      inspectionStatus: string;
      inspectionResult: { outcome: string };
    };
    expect(onHoldBody.vehicleStatus).toBe('returned');
    expect(onHoldBody.inspectionStatus).toBe('completed');
    expect(onHoldBody.inspectionResult.outcome).toBe('on_hold');

    const onHoldList = await request(app.getHttpServer())
      .get('/api/v1/fleet-leasing/returns')
      .query({ organizationId, page: 1, pageSize: 50 })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
    const onHoldRow = (
      onHoldList.body as {
        items: Array<{
          id: string;
          nextSteps: Array<{ actionKey: string; enabled: boolean }>;
        }>;
      }
    ).items.find((i) => i.id === inspectionId);
    expect(onHoldRow?.nextSteps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ actionKey: 'resolve_hold', enabled: true }),
      ]),
    );

    const resolveRes = await request(app.getHttpServer())
      .post(`/api/v1/fleet-leasing/returns/${inspectionId}/resolve-hold`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({ resolutionNote: 'Ops cleared hold' })
      .expect((res) => expect([200, 201]).toContain(res.status));

    const resolved = resolveRes.body as {
      inspectionStatus: string;
      vehicleStatus: string;
      inspectionResult: unknown;
      inspectionFinalizeDraft: { disposition: string | null };
    };
    expect(resolved.inspectionStatus).toBe('ready_to_finalize');
    expect(resolved.vehicleStatus).toBe('returned');
    expect(resolved.inspectionResult).toBeFalsy();
    expect(resolved.inspectionFinalizeDraft.disposition).toBeNull();

    await expectAuditLog(db, {
      organizationId,
      action: 'fleet_return.resolve_hold',
      resourceId: inspectionId,
    });

    const afterResolveList = await request(app.getHttpServer())
      .get('/api/v1/fleet-leasing/returns')
      .query({ organizationId, page: 1, pageSize: 50 })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
    const afterRow = (
      afterResolveList.body as {
        items: Array<{
          id: string;
          nextSteps: Array<{ actionKey: string; enabled: boolean }>;
        }>;
      }
    ).items.find((i) => i.id === inspectionId);
    expect(afterRow?.nextSteps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actionKey: 'finalize_inspection',
          enabled: true,
        }),
      ]),
    );

    const completeRes = await request(app.getHttpServer())
      .post(`/api/v1/fleet-leasing/returns/${inspectionId}/inspection/finalize`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        disposition: 'ready_to_lease',
        waiveAllRecovery: true,
        inspectorConfirmed: true,
      })
      .expect((res) => expect([200, 201]).toContain(res.status));

    const completeBody = completeRes.body as {
      vehicleStatus: string;
      inspectionResult: { outcome: string };
    };
    expect(completeBody.vehicleStatus).toBe('available');
    expect(completeBody.inspectionResult.outcome).toBe('ready_to_lease');
  });

  it('LEASE-09-RETIRE: finalize retire sets fleet vehicle retired', async () => {
    const { inspectionId } =
      await createReturnInspectionReadyToFinalize('RetireDisp');

    const retireRes = await request(app.getHttpServer())
      .post(`/api/v1/fleet-leasing/returns/${inspectionId}/inspection/finalize`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        disposition: 'retire',
        waiveAllRecovery: true,
        inspectorConfirmed: true,
      })
      .expect((res) => expect([200, 201]).toContain(res.status));

    const body = retireRes.body as {
      vehicleStatus: string;
      inspectionResult: { outcome: string };
    };
    expect(body.vehicleStatus).toBe('retired');
    expect(body.inspectionResult.outcome).toBe('retired');

    const retireAudit = await expectAuditLog(db, {
      organizationId,
      action: 'fleet_return.complete_inspection',
      resourceId: inspectionId,
    });
    expect(retireAudit.metadata).toEqual(
      expect.objectContaining({
        disposition: 'retire',
        vehicleStatus: 'retired',
      }),
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
    const { assetClassName: assetClass } =
      await seedAssetRegisterClassWithVehicle('Sedan', unique);

    const clientRes = await request(app.getHttpServer())
      .post('/api/v1/fleet-leasing/clients')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        companyName: `Renew Client ${unique}`,
        ...fleetClientStructuredAddressIn(),
        pointsOfContact: [
          {
            name: 'POC Renew',
            contactNumber: uniqueIntegrationPhone(`renew-${unique}`),
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

    await request(app.getHttpServer())
      .get('/api/v1/fleet-leasing/renewals-extensions')
      .query({
        organizationId,
        page: 1,
        pageSize: 50,
        sortBy: 'startDate',
        sortOrder: 'asc',
      })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/fleet-leasing/lease-contracts/${activeId}/renew`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${updateOnlyToken}`)
      .set('x-organization-id', organizationId)
      .send({ newTermMonths: 12, newStartDate: '2026-06-01' })
      .expect(400);

    const renewRes = await request(app.getHttpServer())
      .post(`/api/v1/fleet-leasing/lease-contracts/${activeId}/renew`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${updateOnlyToken}`)
      .set('x-organization-id', organizationId)
      .send({ newTermMonths: 24, newStartDate: '2028-01-12' })
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
      .send({ newTermMonths: 6, newStartDate: '2030-01-12' })
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

  describe('Support — vehicle replacement', () => {
    async function seedActiveContractWithTwoFleetVehicles(unique: number) {
      const { assetClassName: assetClass } =
        await seedAssetRegisterClassWithVehicle(
          `SupportReplace-${unique}`,
          unique,
        );
      const onLeaseReg = `MH-SUP-ON-${unique}`;
      const replacementReg = `MH-SUP-REP-${unique}`;
      const onLeaseRes = await request(app.getHttpServer())
        .post('/api/v1/fleet-leasing/vehicles')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          vin: `VIN-SUP-ON-${unique}`,
          registrationNo: onLeaseReg,
          registrationExpiry: '2030-12-31',
          insuranceExpiry: '2030-12-31',
          assetClass,
        })
        .expect((res) => expect([200, 201]).toContain(res.status));
      const onLeaseVehicle = onLeaseRes.body as { id: string };

      const replacementRes = await request(app.getHttpServer())
        .post('/api/v1/fleet-leasing/vehicles')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          vin: `VIN-SUP-REP-${unique}`,
          registrationNo: replacementReg,
          registrationExpiry: '2030-12-31',
          insuranceExpiry: '2030-12-31',
          assetClass,
        })
        .expect((res) => expect([200, 201]).toContain(res.status));
      const replacementVehicle = replacementRes.body as { id: string };

      const clientRes = await request(app.getHttpServer())
        .post('/api/v1/fleet-leasing/clients')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          companyName: `SUP-REP Client ${unique}`,
          ...fleetClientStructuredAddressIn(),
          pointsOfContact: [
            {
              name: 'SUP POC',
              contactNumber: uniqueIntegrationPhone(`sup-rep-${unique}`),
              email: `sup-rep-${unique}@example.com`,
              isPrimary: true,
            },
          ],
        })
        .expect((res) => expect([200, 201]).toContain(res.status));
      const clientId = (clientRes.body as FleetClientResponse).id;

      const draft = await createDraftLeaseContract(app, {
        organizationId,
        token: accessToken,
        clientId,
      });

      await request(app.getHttpServer())
        .put(`/api/v1/fleet-leasing/lease-contracts/${draft.id}/asset-lines`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          assetLines: [
            {
              assetClass,
              committedQuantity: 1,
              ratePerVehicleMonth: '25000.00',
            },
          ],
        })
        .expect(200);

      await request(app.getHttpServer())
        .put(`/api/v1/fleet-leasing/lease-contracts/${draft.id}/terms`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          startDate: '2026-03-01',
          termMonths: 12,
          securityDeposit: '40000.00',
          billingFrequency: 'monthly',
        })
        .expect(200);

      await request(app.getHttpServer())
        .post(`/api/v1/fleet-leasing/lease-contracts/${draft.id}/confirm`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect((res) => expect([200, 201]).toContain(res.status));

      await request(app.getHttpServer())
        .post(
          `/api/v1/fleet-leasing/lease-contracts/${draft.id}/vehicle-allocations`,
        )
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          vehicleId: onLeaseVehicle.id,
          notifiedStakeholders: [DEV_ADMIN_EMAIL],
        })
        .expect((res) => expect([200, 201]).toContain(res.status));

      return {
        contractId: draft.id,
        clientId,
        onLeaseVehicleId: onLeaseVehicle.id,
        replacementVehicleId: replacementVehicle.id,
        onLeaseReg,
        replacementReg,
        assetClass,
      };
    }

    it('returns 401 without token on vehicle replacement POST', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/fleet-leasing/support/vehicle-replacements')
        .send({
          organizationId,
          replacements: [],
        })
        .expect(401);
    });

    it('returns 401 without token on on-lease vehicle lookup GET', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/fleet-leasing/support/on-lease-vehicle-lookup')
        .query({ organizationId, q: 'MH-TEST' })
        .expect(401);
    });

    it('allows view-only user on on-lease vehicle lookup GET (read permission)', async () => {
      const unique = Date.now();
      const seeded = await seedActiveContractWithTwoFleetVehicles(unique);
      await request(app.getHttpServer())
        .get('/api/v1/fleet-leasing/support/on-lease-vehicle-lookup')
        .query({ organizationId, q: seeded.onLeaseReg })
        .set('Authorization', `Bearer ${fleetViewOnlyToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);
    });

    it('resolves fleet register vehicle by registration but rejects when not on lease', async () => {
      const unique = Date.now();
      await seedAssetRegisterClassWithVehicle('SupportAvail', unique);
      const registrationNumber = `AR-L05-${unique}`.slice(0, 32);

      const notOnLease = await request(app.getHttpServer())
        .get('/api/v1/fleet-leasing/support/on-lease-vehicle-lookup')
        .query({ organizationId, q: registrationNumber })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(404);
      const notOnLeaseBody = notOnLease.body as { message?: string };
      expect(String(notOnLeaseBody.message ?? '')).toContain(
        'not on an eligible active lease contract',
      );
    });

    it('returns 403 for view-only user on vehicle replacement POST', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/fleet-leasing/support/vehicle-replacements')
        .set('Authorization', `Bearer ${fleetViewOnlyToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          replacements: [
            {
              contractId: randomUUID(),
              fromVehicleId: randomUUID(),
              toVehicleId: randomUUID(),
            },
          ],
        })
        .expect(403);
    });

    it('returns 403 on lookup for foreign organisation context', async () => {
      const unique = Date.now();
      const seeded = await seedActiveContractWithTwoFleetVehicles(unique);
      const otherOrgId = randomUUID();
      await request(app.getHttpServer())
        .get('/api/v1/fleet-leasing/support/on-lease-vehicle-lookup')
        .query({
          organizationId: otherOrgId,
          q: seeded.onLeaseReg,
        })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', otherOrgId)
        .expect((res) => expect([403, 404]).toContain(res.status));
    });

    it('returns 403 or 404 for allocated vehicles with foreign organisation', async () => {
      const unique = Date.now();
      const seeded = await seedActiveContractWithTwoFleetVehicles(unique);
      const otherOrgId = randomUUID();
      await request(app.getHttpServer())
        .get(
          `/api/v1/fleet-leasing/support/lease-contracts/${seeded.contractId}/allocated-vehicles`,
        )
        .query({ organizationId: otherOrgId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', otherOrgId)
        .expect((res) => expect([403, 404]).toContain(res.status));
    });

    it('lists active contracts and replacement candidates for seeded contract', async () => {
      const unique = Date.now();
      const seeded = await seedActiveContractWithTwoFleetVehicles(unique);

      const contractsRes = await request(app.getHttpServer())
        .get(
          `/api/v1/fleet-leasing/support/clients/${seeded.clientId}/active-contracts`,
        )
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);
      const contractsBody = contractsRes.body as {
        items: Array<{ id: string }>;
      };
      expect(contractsBody.items.map((c) => c.id)).toContain(seeded.contractId);

      const candidatesRes = await request(app.getHttpServer())
        .get('/api/v1/fleet-leasing/support/replacement-candidates')
        .query({
          organizationId,
          assetClass: seeded.assetClass,
          pageSize: 50,
        })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);
      const candidatesBody = candidatesRes.body as {
        items: Array<{ id: string }>;
      };
      expect(candidatesBody.items.map((v) => v.id)).toContain(
        seeded.replacementVehicleId,
      );
    });

    it('filters replacement candidates by sourceKind (legacy vs register)', async () => {
      const unique = Date.now();
      const seeded = await seedActiveContractWithTwoFleetVehicles(unique);

      const registerListRes = await request(app.getHttpServer())
        .get('/api/v1/asset-register/vehicles')
        .query({ organizationId, pageSize: 50 })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);
      const registerBody = registerListRes.body as {
        items: Array<{ id: string; registrationNumber: string }>;
      };
      const registerVehicle = registerBody.items.find((v) =>
        v.registrationNumber.startsWith(`AR-L05-${unique}`),
      );
      expect(registerVehicle).toBeTruthy();

      const legacyCandidates = await request(app.getHttpServer())
        .get('/api/v1/fleet-leasing/support/replacement-candidates')
        .query({
          organizationId,
          sourceKind: 'legacy',
          assetClass: seeded.assetClass,
          pageSize: 50,
        })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);
      const legacyIds = (
        legacyCandidates.body as { items: Array<{ id: string }> }
      ).items.map((v) => v.id);
      expect(legacyIds).toContain(seeded.replacementVehicleId);
      expect(legacyIds).not.toContain(registerVehicle!.id);

      const registerCandidates = await request(app.getHttpServer())
        .get('/api/v1/fleet-leasing/support/replacement-candidates')
        .query({
          organizationId,
          sourceKind: 'register',
          assetClass: seeded.assetClass,
          pageSize: 50,
        })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);
      const registerIds = (
        registerCandidates.body as { items: Array<{ id: string }> }
      ).items.map((v) => v.id);
      expect(registerIds).toContain(registerVehicle!.id);
      expect(registerIds).not.toContain(seeded.replacementVehicleId);
    });

    it('rejects unknown keys on vehicle replacement POST body', async () => {
      const unique = Date.now();
      const seeded = await seedActiveContractWithTwoFleetVehicles(unique);

      await request(app.getHttpServer())
        .post('/api/v1/fleet-leasing/support/vehicle-replacements')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          unexpectedField: true,
          replacements: [
            {
              contractId: seeded.contractId,
              fromVehicleId: seeded.onLeaseVehicleId,
              toVehicleId: seeded.replacementVehicleId,
            },
          ],
        })
        .expect(400);
    });

    it('happy path: lookup, swap, and audit', async () => {
      const unique = Date.now();
      const seeded = await seedActiveContractWithTwoFleetVehicles(unique);

      const lookupRes = await request(app.getHttpServer())
        .get('/api/v1/fleet-leasing/support/on-lease-vehicle-lookup')
        .query({ organizationId, q: seeded.onLeaseReg })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);
      const lookupBody = lookupRes.body as {
        vehicle: { id: string; registrationNo: string };
        contract: { id: string };
      };
      expect(lookupBody.vehicle.id).toBe(seeded.onLeaseVehicleId);
      expect(lookupBody.contract.id).toBe(seeded.contractId);

      const swapRes = await request(app.getHttpServer())
        .post('/api/v1/fleet-leasing/support/vehicle-replacements')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          replacements: [
            {
              contractId: seeded.contractId,
              fromVehicleId: seeded.onLeaseVehicleId,
              toVehicleId: seeded.replacementVehicleId,
            },
          ],
        })
        .expect((res) => expect([200, 201]).toContain(res.status));

      const swapBody = swapRes.body as { replacedCount: number };
      expect(swapBody.replacedCount).toBe(1);

      await expectAuditLog(db, {
        organizationId,
        action: 'fleet_leasing.vehicle_replacement',
        resourceId: seeded.contractId,
      });

      const allocatedRes = await request(app.getHttpServer())
        .get(
          `/api/v1/fleet-leasing/support/lease-contracts/${seeded.contractId}/allocated-vehicles`,
        )
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);
      const allocatedBody = allocatedRes.body as {
        items: Array<{ id: string }>;
      };
      expect(allocatedBody.items.map((v) => v.id)).toContain(
        seeded.replacementVehicleId,
      );
      expect(allocatedBody.items.map((v) => v.id)).not.toContain(
        seeded.onLeaseVehicleId,
      );
    });

    it('rejects replacement when target vehicle is not available', async () => {
      const unique = Date.now();
      const seeded = await seedActiveContractWithTwoFleetVehicles(unique);

      const expiredRes = await request(app.getHttpServer())
        .post('/api/v1/fleet-leasing/vehicles')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          vin: `VIN-SUP-EXP-${unique}`,
          registrationNo: `MH-SUP-EXP-${unique}`,
          registrationExpiry: '2020-01-01',
          insuranceExpiry: '2020-01-01',
          assetClass: seeded.assetClass,
        })
        .expect((res) => expect([200, 201]).toContain(res.status));
      const expiredVehicle = expiredRes.body as { id: string };

      await request(app.getHttpServer())
        .post('/api/v1/fleet-leasing/support/vehicle-replacements')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          replacements: [
            {
              contractId: seeded.contractId,
              fromVehicleId: seeded.onLeaseVehicleId,
              toVehicleId: expiredVehicle.id,
            },
          ],
        })
        .expect(400);
    });

    it('allows cross-class replacement on legacy fleet vehicles', async () => {
      const unique = Date.now();
      const seeded = await seedActiveContractWithTwoFleetVehicles(unique);

      const otherClassRes = await request(app.getHttpServer())
        .post('/api/v1/fleet-leasing/vehicles')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          vin: `VIN-SUP-OTHER-${unique}`,
          registrationNo: `MH-SUP-OTHER-${unique}`,
          registrationExpiry: '2030-12-31',
          insuranceExpiry: '2030-12-31',
          assetClass: `Different Class ${unique}`,
        })
        .expect((res) => expect([200, 201]).toContain(res.status));
      const otherClassVehicle = otherClassRes.body as { id: string };

      await request(app.getHttpServer())
        .post('/api/v1/fleet-leasing/support/vehicle-replacements')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          replacements: [
            {
              contractId: seeded.contractId,
              fromVehicleId: seeded.onLeaseVehicleId,
              toVehicleId: otherClassVehicle.id,
            },
          ],
        })
        .expect((res) => expect([200, 201]).toContain(res.status));
    });

    it('resolves available replacement lookup for legacy available vehicle', async () => {
      const unique = Date.now();
      const seeded = await seedActiveContractWithTwoFleetVehicles(unique);

      const lookupRes = await request(app.getHttpServer())
        .get('/api/v1/fleet-leasing/support/available-replacement-lookup')
        .query({ organizationId, q: seeded.replacementReg })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);
      const body = lookupRes.body as {
        vehicle: { id: string; registrationNo: string };
      };
      expect(body.vehicle.id).toBe(seeded.replacementVehicleId);
      expect(body.vehicle.registrationNo).toBe(seeded.replacementReg);
    });

    it('returns brands for replacement filter options when register vehicle exists', async () => {
      const unique = Date.now();
      await seedAssetRegisterClassWithVehicle('FilterOpts', unique);

      const res = await request(app.getHttpServer())
        .get('/api/v1/fleet-leasing/support/replacement-filter-options')
        .query({ organizationId, vehicleType: '4W' })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);
      const body = res.body as { brands: string[] };
      expect(body.brands).toContain('Test');
    });

    it('rejects mixed legacy/register catalog in one replacement pair', async () => {
      const unique = Date.now();
      const seeded = await seedActiveContractWithTwoFleetVehicles(unique);

      const registerListRes = await request(app.getHttpServer())
        .get('/api/v1/asset-register/vehicles')
        .query({ organizationId, pageSize: 50 })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);
      const registerBody = registerListRes.body as {
        items: Array<{ id: string; registrationNumber: string }>;
      };
      const registerVehicle = registerBody.items.find((v) =>
        v.registrationNumber.startsWith(`AR-L05-${unique}`),
      );
      expect(registerVehicle).toBeTruthy();

      const mismatchRes = await request(app.getHttpServer())
        .post('/api/v1/fleet-leasing/support/vehicle-replacements')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          replacements: [
            {
              contractId: seeded.contractId,
              fromVehicleId: seeded.onLeaseVehicleId,
              toVehicleId: registerVehicle!.id,
            },
          ],
        })
        .expect(400);
      const mismatchBody = mismatchRes.body as { message?: string };
      expect(String(mismatchBody.message)).toContain('same catalog');
    });

    it('rejects duplicate replacement vehicle in one request', async () => {
      const unique = Date.now();
      const seeded = await seedActiveContractWithTwoFleetVehicles(unique);

      const extraRes = await request(app.getHttpServer())
        .post('/api/v1/fleet-leasing/vehicles')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          vin: `VIN-SUP-DUP-FROM-${unique}`,
          registrationNo: `MH-SUP-DUP-FROM-${unique}`,
          registrationExpiry: '2030-12-31',
          insuranceExpiry: '2030-12-31',
          assetClass: seeded.assetClass,
        })
        .expect((res) => expect([200, 201]).toContain(res.status));
      const extraOnLease = extraRes.body as { id: string };

      await request(app.getHttpServer())
        .post(
          `/api/v1/fleet-leasing/lease-contracts/${seeded.contractId}/vehicle-allocations`,
        )
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          vehicleId: extraOnLease.id,
          notifiedStakeholders: [DEV_ADMIN_EMAIL],
        })
        .expect((res) => expect([200, 201]).toContain(res.status));

      await request(app.getHttpServer())
        .post('/api/v1/fleet-leasing/support/vehicle-replacements')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          replacements: [
            {
              contractId: seeded.contractId,
              fromVehicleId: seeded.onLeaseVehicleId,
              toVehicleId: seeded.replacementVehicleId,
            },
            {
              contractId: seeded.contractId,
              fromVehicleId: extraOnLease.id,
              toVehicleId: seeded.replacementVehicleId,
            },
          ],
        })
        .expect(400);
    });

    it('rejects when from vehicle is not on the contract', async () => {
      const unique = Date.now();
      const seeded = await seedActiveContractWithTwoFleetVehicles(unique);

      await request(app.getHttpServer())
        .post('/api/v1/fleet-leasing/support/vehicle-replacements')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          replacements: [
            {
              contractId: seeded.contractId,
              fromVehicleId: seeded.replacementVehicleId,
              toVehicleId: seeded.replacementVehicleId,
            },
          ],
        })
        .expect(400);

      await request(app.getHttpServer())
        .post('/api/v1/fleet-leasing/support/vehicle-replacements')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          replacements: [
            {
              contractId: seeded.contractId,
              fromVehicleId: seeded.replacementVehicleId,
              toVehicleId: seeded.onLeaseVehicleId,
            },
          ],
        })
        .expect(400);
    });
  });

  it('lists distinct asset register class names for the organization', async () => {
    const unique = Date.now();
    const modelName = `Register Class ${unique}`;
    const createRes = await request(app.getHttpServer())
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
    const created = createRes.body as { id: string; name: string };
    const createdName = created.name;
    const createdId = created.id;

    let page = 1;
    const pageSize = 50;
    let found = false;
    while (!found) {
      const res = await request(app.getHttpServer())
        .get('/api/v1/fleet-leasing/asset-classes')
        .query({ organizationId, page, pageSize })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);

      const body = res.body as FleetAssetClassListResponse;
      expect(Array.isArray(body.items)).toBe(true);
      expect(Array.isArray(body.catalog)).toBe(true);
      const catalogRow = body.catalog.find((row) => row.id === createdId);
      if (body.items.includes(createdName) && catalogRow) {
        expect(catalogRow.name).toBe(createdName);
        expect(catalogRow.specLabel.length).toBeGreaterThan(0);
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

  it('creates lease asset line using assetClassId', async () => {
    const unique = Date.now();
    const classId = (
      await request(app.getHttpServer())
        .post('/api/v1/asset-register/asset-classes')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          modelName: `LeaseById ${unique}`,
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
        .expect((res) => expect([200, 201]).toContain(res.status))
    ).body as { id: string; name: string };

    const draftRes = await request(app.getHttpServer())
      .post('/api/v1/fleet-leasing/lease-contracts')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({ organizationId })
      .expect((res) => expect([200, 201]).toContain(res.status));
    const draft = draftRes.body as { id: string };

    await request(app.getHttpServer())
      .put(`/api/v1/fleet-leasing/lease-contracts/${draft.id}/asset-lines`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        assetLines: [
          {
            assetClassId: classId.id,
            committedQuantity: 1,
            ratePerVehicleMonth: '1000.00',
          },
        ],
        confirmShortfall: true,
      })
      .expect(200);

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/fleet-leasing/lease-contracts/${draft.id}`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
    const lines = (
      detail.body as { assetLines: Array<{ assetClassId: string }> }
    ).assetLines;
    expect(lines[0]?.assetClassId).toBe(classId.id);
  });

  it('returns 400 for invalid sortBy on lease contract list', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/fleet-leasing/lease-contracts')
      .query({ organizationId, sortBy: 'notAColumn' })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(400);
  });

  describe('Fleet returns hub RBAC', () => {
    const ASSET_REGISTER_VIEW_ONLY_USER = {
      email: 'fleet-returns.assetview@grubpac.local',
      password: 'AssetViewOnly123!',
      fullName: 'Fleet Returns Asset View',
      roleName: 'Fleet Returns Asset View Only',
      permissionKeys: ['asset_register.view'],
    } as const;

    const NO_RETURNS_PERMISSION_USER = {
      email: 'fleet-returns.noperm@grubpac.local',
      password: 'NoPermTest123!',
      fullName: 'No Returns Permission',
      roleName: 'No Returns Permission',
      permissionKeys: ['administration.view'],
    } as const;

    it('returns 401 without JWT on GET returns list', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/fleet-leasing/returns')
        .query({ organizationId, page: 1, pageSize: 10 })
        .expect(401);
    });

    it('returns 403 without fleet_leasing or asset_register view', async () => {
      await ensureUserWithPermissions(
        db,
        organizationId,
        NO_RETURNS_PERMISSION_USER,
      );
      const token = await loginAs(
        app,
        NO_RETURNS_PERMISSION_USER.email,
        NO_RETURNS_PERMISSION_USER.password,
      );
      await request(app.getHttpServer())
        .get('/api/v1/fleet-leasing/returns')
        .query({ organizationId, page: 1, pageSize: 10 })
        .set('Authorization', `Bearer ${token}`)
        .set('x-organization-id', organizationId)
        .expect(403);
    });

    it('allows fleet_leasing.view on GET returns list', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/fleet-leasing/returns')
        .query({ organizationId, page: 1, pageSize: 10 })
        .set('Authorization', `Bearer ${fleetViewOnlyToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);
    });

    it('allows asset_register.view on GET returns list', async () => {
      await ensureUserWithPermissions(
        db,
        organizationId,
        ASSET_REGISTER_VIEW_ONLY_USER,
      );
      const token = await loginAs(
        app,
        ASSET_REGISTER_VIEW_ONLY_USER.email,
        ASSET_REGISTER_VIEW_ONLY_USER.password,
      );
      await request(app.getHttpServer())
        .get('/api/v1/fleet-leasing/returns')
        .query({ organizationId, page: 1, pageSize: 10 })
        .set('Authorization', `Bearer ${token}`)
        .set('x-organization-id', organizationId)
        .expect(200);
    });
  });
});
