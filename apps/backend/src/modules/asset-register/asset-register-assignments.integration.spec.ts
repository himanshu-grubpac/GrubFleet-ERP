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

const ASSET_VIEW_ONLY_USER = {
  email: 'asset.assign.viewonly@grubpac.local',
  password: 'AssetAssignViewOnly123!',
  fullName: 'Asset Assign View Only',
  roleName: 'Asset Assign View Only',
  permissionKeys: ['asset_register.view'],
} as const;

describe('Asset Register — vehicle assignments (integration)', () => {
  if (process.env.SKIP_DB_INTEGRATION === '1') {
    it.todo('skipped when SKIP_DB_INTEGRATION=1');
    return;
  }

  let ctx: IntegrationAuthContext;
  let app: INestApplication<App>;
  let db: AppDatabase;
  let organizationId: string;
  let accessToken: string;
  let assetViewOnlyToken: string;

  beforeAll(async () => {
    ctx = await bootstrapIntegrationAuth();
    ({ app, db, organizationId } = ctx);
    accessToken = ctx.adminAccessToken;

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

  async function createAssetClass(name: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/asset-register/asset-classes')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        name,
        vehicleType: '4W',
        fuelType: 'Diesel',
        fuelTankCapacity: 60,
        ratedLoadFrom: 500,
        ratedLoadTo: 1500,
      })
      .expect(201);
    return (res.body as { id: string }).id;
  }

  async function createMaster(
    assetClassId: string,
    name: string,
  ): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/asset-register/asset-masters')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({ organizationId, assetClassId, name })
      .expect(201);
    return (res.body as { id: string }).id;
  }

  async function createVehicle(
    assetClassId: string,
    assetMasterId: string,
  ): Promise<{ id: string; fleetCode: string }> {
    const unique = Date.now();
    const res = await request(app.getHttpServer())
      .post('/api/v1/asset-register/vehicles')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        assetClassId,
        assetMasterId,
        registrationNumber: `AR-ASGN-${unique}`.slice(0, 32),
        chassisNumber: `CH-ASGN-${unique}`,
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
      .expect(201);
    return res.body as { id: string; fleetCode: string };
  }

  async function createOrganisationClientMatchingName(
    clientName: string,
  ): Promise<string> {
    const unique = Date.now();
    const res = await request(app.getHttpServer())
      .post('/api/v1/organisation/clients')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        clientName,
        addressLine1: 'Line 1',
        addressCountry: 'IN',
        addressState: 'Maharashtra',
        addressDistrict: 'Mumbai',
        addressPincode: '400001',
        pointsOfContact: [
          {
            name: 'Org POC',
            contactNumber: '+919888877771',
            email: `org-client-${unique}@grubpac.local`,
            isPrimary: true,
          },
        ],
      })
      .expect((res) => expect([200, 201]).toContain(res.status));
    return (res.body as { id: string }).id;
  }

  async function createActiveLeaseForClass(
    assetClassName: string,
    committedQuantity: number,
  ): Promise<{ contractId: string; organisationClientId: string }> {
    const unique = Date.now();
    const companyName = `Assign Client ${unique}`;
    const organisationClientId =
      await createOrganisationClientMatchingName(companyName);

    const clientRes = await request(app.getHttpServer())
      .post('/api/v1/fleet-leasing/clients')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        companyName,
        pointsOfContact: [
          {
            name: 'POC',
            contactNumber: '+919999999991',
            email: `assign-${unique}@example.com`,
            isPrimary: true,
          },
        ],
      })
      .expect((res) => expect([200, 201]).toContain(res.status));
    const clientId = (clientRes.body as { id: string }).id;

    const draftRes = await request(app.getHttpServer())
      .post('/api/v1/fleet-leasing/lease-contracts')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({ organizationId, clientId })
      .expect((res) => expect([200, 201]).toContain(res.status));
    const contractId = (draftRes.body as { id: string }).id;

    await request(app.getHttpServer())
      .put(`/api/v1/fleet-leasing/lease-contracts/${contractId}/asset-lines`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        assetLines: [
          {
            assetClass: assetClassName,
            committedQuantity,
            ratePerVehicleMonth: '34500.00',
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
        startDate: '2026-01-12',
        termMonths: 24,
        securityDeposit: '45000.00',
        billingFrequency: 'monthly',
      })
      .expect(200);

    const confirmRes = await request(app.getHttpServer())
      .post(`/api/v1/fleet-leasing/lease-contracts/${contractId}/confirm`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId);
    if (![200, 201].includes(confirmRes.status)) {
      throw new Error(
        `Lease confirm failed ${confirmRes.status}: ${JSON.stringify(confirmRes.body)}`,
      );
    }

    const activatedStatus = (confirmRes.body as { activatedStatus?: string })
      .activatedStatus;
    if (activatedStatus !== 'active') {
      throw new Error(
        `Expected active lease after confirm, got ${activatedStatus ?? 'unknown'}`,
      );
    }

    return { contractId, organisationClientId };
  }

  it('returns 401 without JWT on bulk assign', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/asset-register/vehicle-assignments/bulk-assign')
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        leaseContractId: '00000000-0000-4000-8000-000000000001',
        vehicleIds: ['00000000-0000-4000-8000-000000000002'],
      })
      .expect(401);
  });

  it('returns 403 for view-only user on bulk assign', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/asset-register/vehicle-assignments/bulk-assign')
      .set('Authorization', `Bearer ${assetViewOnlyToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        leaseContractId: '00000000-0000-4000-8000-000000000001',
        vehicleIds: ['00000000-0000-4000-8000-000000000002'],
      })
      .expect(403);
  });

  it('assigns available vehicle to active lease and unassigns', async () => {
    const unique = Date.now();
    const className = 'Sedan';
    const classId = await createAssetClass(className);
    const masterId = await createMaster(classId, `Master ${unique}`);
    const vehicle = await createVehicle(classId, masterId);
    const { contractId, organisationClientId } =
      await createActiveLeaseForClass(className, 1);

    const assignRes = await request(app.getHttpServer())
      .post('/api/v1/asset-register/vehicle-assignments/bulk-assign')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        leaseContractId: contractId,
        organisationClientId,
        vehicleIds: [vehicle.id],
      })
      .expect(200);

    const assignBody = assignRes.body as {
      assignedCount: number;
      assignments: { vehicleId: string }[];
    };
    expect(assignBody.assignedCount).toBe(1);
    expect(assignBody.assignments[0]?.vehicleId).toBe(vehicle.id);

    await expectAuditLog(db, {
      organizationId,
      action: 'asset_register_vehicle.assign',
      resourceId: contractId,
    });

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/asset-register/vehicles/${vehicle.id}`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
    expect(
      (detail.body as { operationalStatus: string }).operationalStatus,
    ).toBe('leased');

    const unassignRes = await request(app.getHttpServer())
      .patch(
        `/api/v1/asset-register/vehicle-assignments/${vehicle.id}/unassign`,
      )
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
    expect(
      (unassignRes.body as { operationalStatus: string }).operationalStatus,
    ).toBe('available');

    await expectAuditLog(db, {
      organizationId,
      action: 'asset_register_vehicle.unassign',
      resourceId: (unassignRes.body as { assignmentId: string }).assignmentId,
    });
  });

  it('returns NO_ACTIVE_LEASE_CONTRACT when contract is not active', async () => {
    const unique = Date.now();
    const className = `Draft Assign ${unique}`;
    const classId = await createAssetClass(className);
    const masterId = await createMaster(classId, `M ${unique}`);
    const vehicle = await createVehicle(classId, masterId);

    const draftRes = await request(app.getHttpServer())
      .post('/api/v1/fleet-leasing/lease-contracts')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({ organizationId })
      .expect((res) => expect([200, 201]).toContain(res.status));
    const draftId = (draftRes.body as { id: string }).id;

    const res = await request(app.getHttpServer())
      .post('/api/v1/asset-register/vehicle-assignments/bulk-assign')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        leaseContractId: draftId,
        vehicleIds: [vehicle.id],
      })
      .expect(400);

    expect(JSON.stringify(res.body)).toContain('NO_ACTIVE_LEASE_CONTRACT');
  });

  it('returns LEASE_CAPACITY_SHORTFALL when exceeding line capacity', async () => {
    const unique = Date.now();
    const className = 'Sedan';
    const classId = await createAssetClass(className);
    const masterId = await createMaster(classId, `M ${unique}`);
    const v1 = await createVehicle(classId, masterId);
    const v2 = await createVehicle(classId, masterId);
    const { contractId, organisationClientId } =
      await createActiveLeaseForClass(className, 1);

    const res = await request(app.getHttpServer())
      .post('/api/v1/asset-register/vehicle-assignments/bulk-assign')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        leaseContractId: contractId,
        organisationClientId,
        vehicleIds: [v1.id, v2.id],
      })
      .expect(400);

    expect(JSON.stringify(res.body)).toContain('LEASE_CAPACITY_SHORTFALL');
  });

  it('returns ORGANISATION_CLIENT_REQUIRED when lease has fleet client but body omits org client', async () => {
    const unique = Date.now();
    const className = 'Sedan';
    const classId = await createAssetClass(className);
    const masterId = await createMaster(classId, `M ${unique}`);
    const vehicle = await createVehicle(classId, masterId);
    const { contractId } = await createActiveLeaseForClass(className, 1);

    const res = await request(app.getHttpServer())
      .post('/api/v1/asset-register/vehicle-assignments/bulk-assign')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        leaseContractId: contractId,
        vehicleIds: [vehicle.id],
      })
      .expect(400);

    expect(JSON.stringify(res.body)).toContain('ORGANISATION_CLIENT_REQUIRED');
  });

  it('returns ORGANISATION_CLIENT_MISMATCH when org client name differs from fleet client', async () => {
    const unique = Date.now();
    const className = 'Sedan';
    const classId = await createAssetClass(className);
    const masterId = await createMaster(classId, `M ${unique}`);
    const vehicle = await createVehicle(classId, masterId);
    const { contractId } = await createActiveLeaseForClass(className, 1);
    const wrongOrgClientId = await createOrganisationClientMatchingName(
      `Different Name ${unique}`,
    );

    const res = await request(app.getHttpServer())
      .post('/api/v1/asset-register/vehicle-assignments/bulk-assign')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        leaseContractId: contractId,
        organisationClientId: wrongOrgClientId,
        vehicleIds: [vehicle.id],
      })
      .expect(400);

    expect(JSON.stringify(res.body)).toContain('ORGANISATION_CLIENT_MISMATCH');
  });
});
