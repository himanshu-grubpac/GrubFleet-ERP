/// <reference types="jest" />

import { INestApplication } from '@nestjs/common';
import { OrganizationDomainEventsService } from '../../infrastructure/organization-realtime/organization-domain-events.service';
import { OrganizationDomainEventType } from '../../infrastructure/organization-realtime/organization-domain-event.types';
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
import { fleetClientStructuredAddressIn } from '../../../test/helpers/fleet-client-address.fixture';
import { createDraftLeaseContract } from '../../../test/helpers/fleet-leasing-test.util';
import { uniqueIntegrationPhone } from '../../../test/helpers/unique-integration-contact';
import { eq } from 'drizzle-orm';
import { fleetClients } from '../../database/schema/fleet-leasing.schema';

const ASSET_VIEW_ONLY_USER = {
  email: 'asset.assign.viewonly@grubpac.local',
  password: 'AssetAssignViewOnly123!',
  fullName: 'Asset Assign View Only',
  roleName: 'Asset Assign View Only',
  permissionKeys: ['asset_register.view'],
} as const;

describe('Asset Register — vehicle assignments (integration)', () => {
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

  async function createAssetClass(
    modelName: string,
  ): Promise<{ id: string; name: string }> {
    const res = await request(app.getHttpServer())
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
        intakeChecklistItems: ['Helmet'],
      })
      .expect(201);
    const body = res.body as { id: string; name: string };
    return { id: body.id, name: body.name };
  }

  async function createVehicle(
    assetClassId: string,
  ): Promise<{ id: string; fleetCode: string }> {
    const unique = Date.now();
    const res = await request(app.getHttpServer())
      .post('/api/v1/asset-register/vehicles')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        assetClassId,
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
            contactNumber: uniqueIntegrationPhone(`org-${unique}`),
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
    assetClassId?: string,
  ): Promise<{
    contractId: string;
    organisationClientId: string;
    fleetClientId: string;
  }> {
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
        ...fleetClientStructuredAddressIn(),
        pointsOfContact: [
          {
            name: 'POC',
            contactNumber: uniqueIntegrationPhone(`fleet-${unique}`),
            email: `assign-${unique}@example.com`,
            isPrimary: true,
          },
        ],
      })
      .expect((res) => expect([200, 201]).toContain(res.status));
    const clientId = (clientRes.body as { id: string }).id;

    await db
      .update(fleetClients)
      .set({ organisationClientId })
      .where(eq(fleetClients.id, clientId));

    const { id: contractId } = await createDraftLeaseContract(app, {
      organizationId,
      token: accessToken,
      clientId,
    });

    if (assetClassId) {
      for (let i = 0; i < committedQuantity; i += 1) {
        await createVehicle(assetClassId);
      }
    }

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
        ...(assetClassId ? {} : { confirmShortfall: true }),
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

    return { contractId, organisationClientId, fleetClientId: clientId };
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

  it('validate bulk assign flags vehicle already assigned elsewhere', async () => {
    const unique = Date.now();
    const assetClass = await createAssetClass(`Validate Conflict ${unique}`);
    const vehicle = await createVehicle(assetClass.id);
    const spare = await createVehicle(assetClass.id);
    const { contractId, organisationClientId } =
      await createActiveLeaseForClass(assetClass.name, 2, assetClass.id);
    const { contractId: otherContractId } = await createActiveLeaseForClass(
      assetClass.name,
      2,
      assetClass.id,
    );

    await request(app.getHttpServer())
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

    const validateRes = await request(app.getHttpServer())
      .post('/api/v1/asset-register/vehicle-assignments/bulk-assign/validate')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        leaseContractId: otherContractId,
        vehicleIds: [vehicle.id, spare.id],
        assetClassId: assetClass.id,
      })
      .expect(200);

    const validateBody = validateRes.body as {
      conflictCount: number;
      replacementAvailableCount: number;
      allAvailable: boolean;
      vehicles: Array<{
        vehicleId: string;
        available: boolean;
        reason?: string;
      }>;
    };
    expect(validateBody.allAvailable).toBe(false);
    expect(validateBody.conflictCount).toBe(1);
    expect(validateBody.replacementAvailableCount).toBeGreaterThanOrEqual(0);
    const conflictRow = validateBody.vehicles.find(
      (row) => row.vehicleId === vehicle.id,
    );
    expect(conflictRow?.available).toBe(false);
    expect(conflictRow?.reason).toBe('assigned_elsewhere');
    const spareRow = validateBody.vehicles.find(
      (row) => row.vehicleId === spare.id,
    );
    expect(spareRow?.available).toBe(true);

    const assignConflict = await request(app.getHttpServer())
      .post('/api/v1/asset-register/vehicle-assignments/bulk-assign')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        leaseContractId: otherContractId,
        vehicleIds: [vehicle.id, spare.id],
      })
      .expect(409);

    expect(JSON.stringify(assignConflict.body)).toContain(
      'BULK_ASSIGN_VEHICLE_CONFLICT',
    );
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
    const assetClass = await createAssetClass(`Sedan ${unique}`);
    const vehicle = await createVehicle(assetClass.id);
    const { contractId, organisationClientId } =
      await createActiveLeaseForClass(assetClass.name, 2, assetClass.id);

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
      contractId: string;
      contractNumber: string;
      clientName: string;
      remainingToAssignOnLine: number;
      fleetCode: string | null;
      assignments: { vehicleId: string }[];
    };
    expect(assignBody.assignedCount).toBe(1);
    expect(assignBody.assignments[0]?.vehicleId).toBe(vehicle.id);
    expect(assignBody.contractId).toBe(contractId);
    expect(assignBody.contractNumber).toEqual(expect.any(String));
    expect(assignBody.contractNumber.length).toBeGreaterThan(0);
    expect(assignBody.clientName.length).toBeGreaterThan(0);
    expect(assignBody.remainingToAssignOnLine).toBe(1);
    expect(assignBody.fleetCode).toBeTruthy();
    expect(assignBody.assetClassName).toEqual(expect.any(String));
    expect(assignBody.lineCommitted).toBe(2);
    expect(assignBody.lineAllocatedAfter).toBe(1);
    expect(typeof assignBody.fullyAssignedLine).toBe('boolean');
    expect(typeof assignBody.remainingInPoolForClass).toBe('number');
    expect(assignBody.handoverDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

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

  it('allows partial bulk assign batch smaller than line remaining', async () => {
    const unique = Date.now();
    const assetClass = await createAssetClass(`Partial Bulk ${unique}`);
    const { contractId, organisationClientId } =
      await createActiveLeaseForClass(assetClass.name, 5, assetClass.id);
    const listRes = await request(app.getHttpServer())
      .get('/api/v1/asset-register/vehicles')
      .query({
        organizationId,
        assetClassId: assetClass.id,
        operationalStatus: 'available',
        page: 1,
        pageSize: 5,
      })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
    const pool = (listRes.body as { items: Array<{ id: string }> }).items;
    expect(pool.length).toBeGreaterThanOrEqual(2);
    const vehicleIds = pool.slice(0, 2).map((row) => row.id);

    const assignRes = await request(app.getHttpServer())
      .post('/api/v1/asset-register/vehicle-assignments/bulk-assign')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        leaseContractId: contractId,
        organisationClientId,
        vehicleIds,
        handoverDate: '2026-02-01',
        handoverLocation: 'Central depot',
        notes: 'Partial shortage batch',
      })
      .expect(200);

    const assignBody = assignRes.body as {
      assignedCount: number;
      remainingToAssignOnLine: number;
    };
    expect(assignBody.assignedCount).toBe(2);
    expect(assignBody.remainingToAssignOnLine).toBe(3);
  });

  it('returns NO_ACTIVE_LEASE_CONTRACT when contract is not active', async () => {
    const unique = Date.now();
    const assetClass = await createAssetClass(`Draft Assign ${unique}`);
    const vehicle = await createVehicle(assetClass.id);

    const { id: draftId } = await createDraftLeaseContract(app, {
      organizationId,
      token: accessToken,
    });

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
    const assetClass = await createAssetClass(`Sedan ${unique}`);
    const v1 = await createVehicle(assetClass.id);
    const v2 = await createVehicle(assetClass.id);
    const { contractId, organisationClientId } =
      await createActiveLeaseForClass(assetClass.name, 1, assetClass.id);

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

  it('assigns when lease has fleet client and body omits org client (linked org resolved)', async () => {
    const unique = Date.now();
    const assetClass = await createAssetClass(`Sedan ${unique}`);
    const vehicle = await createVehicle(assetClass.id);
    const { contractId } = await createActiveLeaseForClass(
      assetClass.name,
      1,
      assetClass.id,
    );

    const res = await request(app.getHttpServer())
      .post('/api/v1/asset-register/vehicle-assignments/bulk-assign')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        leaseContractId: contractId,
        vehicleIds: [vehicle.id],
      })
      .expect(200);

    expect((res.body as { assignedCount: number }).assignedCount).toBe(1);
  });

  it('assigns when body sends fleet client id as organisationClientId (portal lease detail)', async () => {
    const unique = Date.now();
    const assetClass = await createAssetClass(`Sedan ${unique}`);
    const vehicle = await createVehicle(assetClass.id);
    const { contractId, fleetClientId } = await createActiveLeaseForClass(
      assetClass.name,
      1,
      assetClass.id,
    );

    const res = await request(app.getHttpServer())
      .post('/api/v1/asset-register/vehicle-assignments/bulk-assign')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        leaseContractId: contractId,
        organisationClientId: fleetClientId,
        vehicleIds: [vehicle.id],
      })
      .expect(200);

    expect((res.body as { assignedCount: number }).assignedCount).toBe(1);
  });

  it('returns FLEET_CLIENT_ORGANISATION_LINK_MISSING when fleet client has no org link', async () => {
    const unique = Date.now();
    const assetClass = await createAssetClass(`Sedan ${unique}`);
    const vehicle = await createVehicle(assetClass.id);
    const { contractId, fleetClientId } = await createActiveLeaseForClass(
      assetClass.name,
      1,
      assetClass.id,
    );

    await db
      .update(fleetClients)
      .set({ organisationClientId: null })
      .where(eq(fleetClients.id, fleetClientId));

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

    expect(JSON.stringify(res.body)).toContain(
      'FLEET_CLIENT_ORGANISATION_LINK_MISSING',
    );
  });

  it('returns ORGANISATION_CLIENT_MISMATCH when org client name differs from fleet client', async () => {
    const unique = Date.now();
    const assetClass = await createAssetClass(`Sedan ${unique}`);
    const vehicle = await createVehicle(assetClass.id);
    const { contractId } = await createActiveLeaseForClass(
      assetClass.name,
      1,
      assetClass.id,
    );
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

  it('lists assignable lease contracts for vehicle with capacity flags', async () => {
    const unique = Date.now();
    const assetClass = await createAssetClass(`Assignable ${unique}`);
    const vehicle = await createVehicle(assetClass.id);
    const { contractId, organisationClientId } =
      await createActiveLeaseForClass(assetClass.name, 1, assetClass.id);

    const listRes = await request(app.getHttpServer())
      .get(
        '/api/v1/asset-register/vehicle-assignments/assignable-lease-contracts',
      )
      .query({
        organizationId,
        vehicleId: vehicle.id,
        page: 1,
        pageSize: 50,
      })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);

    const body = listRes.body as {
      hiddenOtherActiveCount: number;
      items: Array<{
        leaseContractId: string;
        assignable: boolean;
        committedQuantity: number;
        allocatedCount: number;
        remainingToAssign: number;
      }>;
    };
    const row = body.items.find((item) => item.leaseContractId === contractId);
    expect(row).toBeDefined();
    expect(row?.assignable).toBe(true);
    expect(row?.remainingToAssign).toBe(1);
    expect(typeof body.hiddenOtherActiveCount).toBe('number');

    await request(app.getHttpServer())
      .post('/api/v1/asset-register/vehicle-assignments/bulk-assign')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        leaseContractId: contractId,
        organisationClientId,
        vehicleIds: [vehicle.id],
        handoverDate: '2026-02-01',
        odometerAtHandover: 1200,
      })
      .expect(200);

    const afterRes = await request(app.getHttpServer())
      .get(
        '/api/v1/asset-register/vehicle-assignments/assignable-lease-contracts',
      )
      .query({
        organizationId,
        vehicleId: vehicle.id,
        page: 1,
        pageSize: 50,
      })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);

    const afterRow = (
      afterRes.body as {
        items: Array<{
          leaseContractId: string;
          assignable: boolean;
          allocatedCount: number;
        }>;
      }
    ).items.find((item) => item.leaseContractId === contractId);
    expect(afterRow?.allocatedCount).toBe(1);
    expect(afterRow?.assignable).toBe(false);
  });

  it('returns no matching contract lines for assignable lease contracts when class not on any lease', async () => {
    const unique = Date.now();
    const assetClass = await createAssetClass(`NoDemand ${unique}`);
    const vehicle = await createVehicle(assetClass.id);

    const res = await request(app.getHttpServer())
      .get(
        '/api/v1/asset-register/vehicle-assignments/assignable-lease-contracts',
      )
      .query({
        organizationId,
        vehicleId: vehicle.id,
        page: 1,
        pageSize: 50,
      })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);

    const body = res.body as {
      items: unknown[];
      hasMatchingContractLine: boolean;
      hasOpenDemand: boolean;
      hiddenOtherActiveCount: number;
      assetClassName: string;
    };
    expect(body.items).toEqual([]);
    expect(body.hasMatchingContractLine).toBe(false);
    expect(body.hasOpenDemand).toBe(false);
    expect(body.assetClassName).toBe(assetClass.name);
    expect(typeof body.hiddenOtherActiveCount).toBe('number');
  });

  it('rejects assignable lease contract list search longer than max length', async () => {
    const assetClass = await createAssetClass(`SearchCap ${Date.now()}`);
    const vehicle = await createVehicle(assetClass.id);

    await request(app.getHttpServer())
      .get(
        '/api/v1/asset-register/vehicle-assignments/assignable-lease-contracts',
      )
      .query({
        organizationId,
        vehicleId: vehicle.id,
        page: 1,
        pageSize: 50,
        search: 'x'.repeat(65),
      })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(400);
  });

  it('returns 401 without JWT on bulk assign catalog', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/asset-register/vehicle-assignments/bulk-assign/catalog')
      .query({ organizationId })
      .expect(401);
  });

  it('allows view-only user to read bulk assign catalog', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/asset-register/vehicle-assignments/bulk-assign/catalog')
      .query({ organizationId })
      .set('Authorization', `Bearer ${assetViewOnlyToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
  });

  it('returns bulk assign catalog clients and contract lines for organisation client', async () => {
    const unique = Date.now();
    const assetClass = await createAssetClass(`BulkCat ${unique}`);
    await createVehicle(assetClass.id);
    const { contractId, organisationClientId } =
      await createActiveLeaseForClass(assetClass.name, 2, assetClass.id);

    const clientsRes = await request(app.getHttpServer())
      .get('/api/v1/asset-register/vehicle-assignments/bulk-assign/catalog')
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);

    const clientsBody = clientsRes.body as {
      clients: Array<{
        organisationClientId: string;
        activeContractCount: number;
        openAssetClassLineCount: number;
      }>;
    };
    expect(Array.isArray(clientsBody.clients)).toBe(true);
    const clientRow = clientsBody.clients.find(
      (c) => c.organisationClientId === organisationClientId,
    );
    expect(clientRow).toBeDefined();
    expect(clientRow!.openAssetClassLineCount).toBeGreaterThanOrEqual(1);

    const detailRes = await request(app.getHttpServer())
      .get('/api/v1/asset-register/vehicle-assignments/bulk-assign/catalog')
      .query({ organizationId, organisationClientId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);

    const detailBody = detailRes.body as {
      contracts: Array<{
        leaseContractId: string;
        unitsStillToAssign: number;
        assetLines: Array<{
          assetClassName: string;
          remainingToAssign: number;
          availableNow: number;
          lineStatus: string;
          selectable: boolean;
        }>;
      }>;
    };
    const contract = detailBody.contracts.find(
      (c) => c.leaseContractId === contractId,
    );
    expect(contract).toBeDefined();
    expect(contract!.unitsStillToAssign).toBeGreaterThanOrEqual(2);
    const line = contract!.assetLines.find(
      (l) => l.assetClassName === assetClass.name,
    );
    expect(line).toBeDefined();
    expect(line!.selectable).toBe(true);
    expect(line!.remainingToAssign).toBeGreaterThanOrEqual(2);
    expect(['enough', 'short']).toContain(line!.lineStatus);
  });

  it('lists assignable lease contracts with open capacity for vehicle class', async () => {
    const unique = Date.now();
    const assetClass = await createAssetClass(`AssignList ${unique}`);
    const vehicle = await createVehicle(assetClass.id);
    const { contractId } = await createActiveLeaseForClass(
      assetClass.name,
      2,
      assetClass.id,
    );

    const res = await request(app.getHttpServer())
      .get(
        '/api/v1/asset-register/vehicle-assignments/assignable-lease-contracts',
      )
      .query({
        organizationId,
        vehicleId: vehicle.id,
        page: 1,
        pageSize: 50,
      })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);

    const body = res.body as {
      items: Array<{
        leaseContractId: string;
        remainingToAssign: number;
        assignable: boolean;
      }>;
      hasMatchingContractLine: boolean;
      hasOpenDemand: boolean;
    };
    expect(body.hasMatchingContractLine).toBe(true);
    expect(body.hasOpenDemand).toBe(true);
    expect(body.items.length).toBeGreaterThanOrEqual(1);
    const row = body.items.find((item) => item.leaseContractId === contractId);
    expect(row?.remainingToAssign).toBeGreaterThanOrEqual(2);
    expect(row?.assignable).toBe(true);
  });

  it('lists available vehicles with open lease demand count for asset class', async () => {
    const unique = Date.now();
    const assetClass = await createAssetClass(`Demand ${unique}`);
    await createVehicle(assetClass.id);
    await createActiveLeaseForClass(assetClass.name, 1, assetClass.id);

    const listRes = await request(app.getHttpServer())
      .get('/api/v1/asset-register/vehicles')
      .query({
        organizationId,
        page: 1,
        pageSize: 50,
        operationalStatus: 'available',
        status: 'active',
        assetClassId: assetClass.id,
      })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);

    const items = (
      listRes.body as {
        items: Array<{
          fleetCode: string;
          chassisNumber: string;
          addedToRegisterDate: string;
          openDemandUnitsToAssign: number;
          openDemandContractCount: number;
        }>;
      }
    ).items;
    expect(items.length).toBeGreaterThanOrEqual(1);
    const row = items.find((item) => item.fleetCode);
    expect(row?.chassisNumber).toBeTruthy();
    expect(row?.addedToRegisterDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(row?.openDemandUnitsToAssign).toBeGreaterThanOrEqual(1);
    expect(row?.openDemandContractCount).toBeGreaterThanOrEqual(1);

    const inDemandRes = await request(app.getHttpServer())
      .get('/api/v1/asset-register/vehicles')
      .query({
        organizationId,
        page: 1,
        pageSize: 50,
        operationalStatus: 'available',
        status: 'active',
        demandFilter: 'in_demand',
        assetClassId: assetClass.id,
      })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);

    expect(
      (inDemandRes.body as { items: unknown[] }).items.length,
    ).toBeGreaterThanOrEqual(1);

    const summaryRes = await request(app.getHttpServer())
      .get('/api/v1/asset-register/vehicles')
      .query({
        organizationId,
        page: 1,
        pageSize: 1,
        operationalStatus: 'available',
        status: 'active',
        includeAssignmentSummary: 'true',
      })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);

    const summary = (
      summaryRes.body as {
        assignmentSummary?: {
          openDemandUnits: number;
          openDemandContractCount: number;
        };
      }
    ).assignmentSummary;
    expect(summary).toBeDefined();
    expect(summary?.openDemandContractCount).toBeGreaterThanOrEqual(1);
    expect(summary?.openDemandUnits).toBeGreaterThanOrEqual(1);
  });

  it('emits assignment domain event after successful bulk assign', async () => {
    const domainEvents = app.get(OrganizationDomainEventsService);
    const emitSpy = jest.spyOn(domainEvents, 'emit');

    const unique = Date.now();
    const assetClass = await createAssetClass(`Realtime Emit ${unique}`);
    const vehicle = await createVehicle(assetClass.id);
    const { contractId, organisationClientId } =
      await createActiveLeaseForClass(assetClass.name, 2, assetClass.id);

    await request(app.getHttpServer())
      .post('/api/v1/asset-register/vehicle-assignments/bulk-assign')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        leaseContractId: contractId,
        organisationClientId,
        vehicleIds: [vehicle.id],
        handoverDate: '2026-03-01',
      })
      .expect(200);

    const assignmentEmitCall = emitSpy.mock.calls.find(
      (call) =>
        call[0]?.type ===
        OrganizationDomainEventType.ASSET_REGISTER_ASSIGNMENT_CHANGED,
    );
    expect(assignmentEmitCall).toBeDefined();
    expect(assignmentEmitCall![0]).toMatchObject({
      type: OrganizationDomainEventType.ASSET_REGISTER_ASSIGNMENT_CHANGED,
      organizationId,
      resource: 'asset_register_vehicle_assignment',
      ids: {
        leaseContractId: contractId,
        vehicleIds: [vehicle.id],
      },
    });

    emitSpy.mockRestore();
  });
});
