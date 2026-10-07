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
import {
  fleetVehicleAllocations,
  fleetVehicles,
  leaseContractVehicles,
  leaseContracts,
  organizations,
} from '../../database/schema';

const NO_ORG_PERMISSION_USER = {
  email: 'org-drivers.viewer@grubpac.local',
  password: 'ViewerTest123!',
  fullName: 'Org Drivers Viewer Only',
  roleName: 'Org Drivers Viewer Only',
  permissionKeys: ['administration.view'],
} as const;

type DriverDetail = { id: string; isActive: boolean; status: string };

type AssignableVehicleRow = {
  id: string;
  vehicleCode: string;
  activeLeaseId: string;
};

async function findAssignableVehicleInPages(
  app: INestApplication<App>,
  accessToken: string,
  organizationId: string,
  predicate: (row: AssignableVehicleRow) => boolean,
): Promise<AssignableVehicleRow | undefined> {
  const pageSize = 50;
  let page = 1;
  let totalPages = 1;
  while (page <= totalPages) {
    const res = await request(app.getHttpServer())
      .get('/api/v1/organisation/drivers/assignable-vehicles')
      .query({ organizationId, page, pageSize })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
    const body = res.body as {
      items: AssignableVehicleRow[];
      totalPages: number;
    };
    totalPages = Math.max(body.totalPages ?? 1, 1);
    const match = body.items.find(predicate);
    if (match) return match;
    page += 1;
  }
  return undefined;
}

describe('Organisation drivers (integration)', () => {
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
  let orgViewOnlyToken: string;
  let driverSupplierId: string;

  beforeAll(async () => {
    ctx = await bootstrapIntegrationAuth();
    ({ app, db, organizationId } = ctx);
    accessToken = ctx.adminAccessToken;
    orgViewOnlyToken = ctx.orgViewOnlyAccessToken;

    await ensureUserWithPermissions(db, organizationId, NO_ORG_PERMISSION_USER);
    viewerToken = await loginAs(
      app,
      NO_ORG_PERMISSION_USER.email,
      NO_ORG_PERMISSION_USER.password,
    );

    const unique = Date.now();
    const supplierRes = await request(app.getHttpServer())
      .post('/api/v1/organisation/suppliers')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        name: `Driver Staffing ${unique}`,
        supplierType: 'driver',
        contactPerson: 'Staffing Contact',
        contactPhone: '+919888877771',
        contactEmail: `driver.supplier.${unique}@grubpac.local`,
        addressLine1: 'Line 1',
        addressCountry: 'IN',
        addressState: 'Maharashtra',
        addressDistrict: 'Mumbai',
        addressPincode: '400001',
      })
      .expect(201);
    driverSupplierId = (supplierRes.body as { id: string }).id;
  }, 90000);

  afterAll(async () => {
    await ctx?.close();
  });

  function buildDriverCreatePayload(
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> {
    const unique = Date.now();
    return {
      organizationId,
      name: `Lattice Driver ${unique}`,
      cprNo: String(unique).slice(-9).padStart(9, '0'),
      phone: '+919888877772',
      email: `driver.${unique}@grubpac.local`,
      licenseNumber: `DL-${unique}`,
      licenseExpiry: '2028-12-31',
      supplierId: driverSupplierId,
      addressLine1: 'Line 1',
      addressCountry: 'IN',
      addressState: 'Maharashtra',
      addressDistrict: 'Mumbai',
      addressPincode: '400001',
      ...overrides,
    };
  }

  async function createDriverAsAdmin(): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/organisation/drivers')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send(buildDriverCreatePayload())
      .expect(201);
    return (res.body as DriverDetail).id;
  }

  describe('security lattice — drivers', () => {
    it('returns 401 without JWT on list and create', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/organisation/drivers')
        .query({ organizationId })
        .expect(401);
      await request(app.getHttpServer())
        .post('/api/v1/organisation/drivers')
        .set('x-organization-id', organizationId)
        .send(buildDriverCreatePayload())
        .expect(401);
    });

    it('returns 403 without organisation permission on list', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/organisation/drivers')
        .query({ organizationId, page: 1, pageSize: 10 })
        .set('Authorization', `Bearer ${viewerToken}`)
        .set('x-organization-id', organizationId)
        .expect(403);
    });

    it('allows organisation.view list but returns 403 on create, patch, and status', async () => {
      const id = await createDriverAsAdmin();

      await request(app.getHttpServer())
        .get('/api/v1/organisation/drivers')
        .query({ organizationId, page: 1, pageSize: 10 })
        .set('Authorization', `Bearer ${orgViewOnlyToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/v1/organisation/drivers')
        .set('Authorization', `Bearer ${orgViewOnlyToken}`)
        .set('x-organization-id', organizationId)
        .send(buildDriverCreatePayload())
        .expect(403);

      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/drivers/${id}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${orgViewOnlyToken}`)
        .set('x-organization-id', organizationId)
        .send({ name: 'View Only Cannot Rename' })
        .expect(403);

      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/drivers/${id}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${orgViewOnlyToken}`)
        .set('x-organization-id', organizationId)
        .send({ action: 'deactivate', reason: 'View only attempt' })
        .expect(403);
    });

    it('returns 403 when organisation context is missing on list', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/organisation/drivers')
        .query({ page: 1, pageSize: 10 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);
    });

    it('returns 403 or 404 on PATCH with another organisation id (IDOR)', async () => {
      const id = await createDriverAsAdmin();
      const fakeOrgId = '00000000-0000-4000-8000-000000000099';
      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/drivers/${id}`)
        .query({ organizationId: fakeOrgId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', fakeOrgId)
        .send({ name: 'Cross Org Rename' })
        .expect((res) => expect([403, 404]).toContain(res.status));
    });

    it('returns 403 or 404 on GET with another organisation id (IDOR)', async () => {
      const id = await createDriverAsAdmin();
      const fakeOrgId = '00000000-0000-4000-8000-000000000099';
      await request(app.getHttpServer())
        .get(`/api/v1/organisation/drivers/${id}`)
        .query({ organizationId: fakeOrgId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', fakeOrgId)
        .expect((res) => expect([403, 404]).toContain(res.status));
    });

    it('returns 400 for unknown JSON key on create', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/organisation/drivers')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send(buildDriverCreatePayload({ hackField: 'x' }))
        .expect(400);
    });

    it('returns 400 when supplierId is not a driver-type supplier', async () => {
      const unique = Date.now();
      const spareRes = await request(app.getHttpServer())
        .post('/api/v1/organisation/suppliers')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          name: `Spare Parts ${unique}`,
          supplierType: 'spare_parts',
          contactPerson: 'Contact',
          contactPhone: '+919876543211',
          contactEmail: `spare.${unique}@grubpac.local`,
          addressLine1: 'Line 1',
          addressCountry: 'IN',
          addressState: 'Maharashtra',
          addressDistrict: 'Mumbai',
          addressPincode: '400001',
        })
        .expect(201);
      const spareId = (spareRes.body as { id: string }).id;

      await request(app.getHttpServer())
        .post('/api/v1/organisation/drivers')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send(buildDriverCreatePayload({ supplierId: spareId }))
        .expect(400);
    });

    it('returns 400 for unknown JSON key on PATCH', async () => {
      const id = await createDriverAsAdmin();
      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/drivers/${id}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ name: 'Valid Name', hackField: 'x' })
        .expect(400);
    });

    it('returns 403 when organisation context is missing on create', async () => {
      const bodyWithoutOrg = buildDriverCreatePayload();
      delete bodyWithoutOrg.organizationId;
      await request(app.getHttpServer())
        .post('/api/v1/organisation/drivers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(bodyWithoutOrg)
        .expect(403);
    });

    it('returns 400 when pageSize exceeds max', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/organisation/drivers')
        .query({ organizationId, page: 1, pageSize: 51 })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(400);
    });

    it('returns 400 when PATCH on inactive driver', async () => {
      const id = await createDriverAsAdmin();
      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/drivers/${id}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ action: 'activate' })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/drivers/${id}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ action: 'deactivate', reason: 'For inactive edit test' })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/drivers/${id}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ name: 'Cannot Edit Inactive' })
        .expect(400);
    });

    it('returns 400 when deactivate reason exceeds max length', async () => {
      const id = await createDriverAsAdmin();
      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/drivers/${id}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ action: 'activate' })
        .expect(200);

      const longReason = 'x'.repeat(501);
      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/drivers/${id}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ action: 'deactivate', reason: longReason })
        .expect(400);
    });

    it('returns 400 when deactivating inactive driver', async () => {
      const id = await createDriverAsAdmin();
      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/drivers/${id}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ action: 'activate' })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/drivers/${id}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ action: 'deactivate', reason: 'First deactivate' })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/drivers/${id}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ action: 'deactivate', reason: 'Again' })
        .expect(400);
    });

    it('writes an audit row on deactivate', async () => {
      const id = await createDriverAsAdmin();
      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/drivers/${id}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ action: 'activate' })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/drivers/${id}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ action: 'deactivate', reason: 'Audit lattice closure' })
        .expect(200);

      const row = await expectAuditLog(db, {
        action: 'organisation.driver.deactivate',
        resourceId: id,
        organizationId,
      });
      expect(row.resourceType).toBe('organisation_driver');
      expect(row.metadata).toEqual({ reason: 'Audit lattice closure' });
    });

    it('creates driver as inactive by default', async () => {
      const id = await createDriverAsAdmin();
      const res = await request(app.getHttpServer())
        .get(`/api/v1/organisation/drivers/${id}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);
      const body = res.body as { status: string; isActive: boolean };
      expect(body.status).toBe('inactive');
      expect(body.isActive).toBe(false);
    });

    it('lists license-expired drivers when status=license-expired', async () => {
      const id = await createDriverAsAdmin();
      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/drivers/${id}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ action: 'activate' })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/drivers/${id}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ licenseExpiry: '2020-01-01' })
        .expect(200);

      const expiredRes = await request(app.getHttpServer())
        .get('/api/v1/organisation/drivers')
        .query({
          organizationId,
          page: 1,
          pageSize: 50,
          status: 'license-expired',
        })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);
      const expiredBody = expiredRes.body as {
        items: Array<{ id: string }>;
      };
      expect(expiredBody.items.some((row) => row.id === id)).toBe(true);
    });

    it('returns empty assignable vehicles when no active lease allocations exist', async () => {
      const unique = Date.now();
      const [emptyFleetOrg] = await db
        .insert(organizations)
        .values({
          name: `Drivers empty fleet org ${unique}`,
          slug: `drivers-empty-fleet-${unique}`,
        })
        .returning();
      const emptyOrgAdmin = {
        email: `org-drivers-empty-fleet-${unique}@grubpac.local`,
        password: 'ViewerTest123!',
        fullName: 'Org Drivers Empty Fleet Admin',
        roleName: `Org Drivers Empty Fleet ${unique}`,
        permissionKeys: [
          'organisation.view',
          'organisation.create',
          'organisation.update',
          'organisation.manage',
        ],
      } as const;
      await ensureUserWithPermissions(db, emptyFleetOrg.id, emptyOrgAdmin);
      const emptyOrgToken = await loginAs(
        app,
        emptyOrgAdmin.email,
        emptyOrgAdmin.password,
      );

      const res = await request(app.getHttpServer())
        .get('/api/v1/organisation/drivers/assignable-vehicles')
        .query({ organizationId: emptyFleetOrg.id, page: 1, pageSize: 10 })
        .set('Authorization', `Bearer ${emptyOrgToken}`)
        .set('x-organization-id', emptyFleetOrg.id)
        .expect(200);
      const body = res.body as { items: unknown[]; total: number };
      expect(body.items).toEqual([]);
      expect(body.total).toBe(0);
    });

    it('lists assignable vehicles on active leases without a linked driver', async () => {
      const unique = Date.now();
      const expiry = new Date('2028-12-31T00:00:00.000Z');
      const [vehicle] = await db
        .insert(fleetVehicles)
        .values({
          organizationId,
          vin: `VIN${unique}`,
          registrationNo: `VH-${unique}`,
          registrationExpiry: expiry,
          insuranceExpiry: expiry,
          assetClass: 'Sedan — Test',
          status: 'leased',
        })
        .returning();
      const [contract] = await db
        .insert(leaseContracts)
        .values({
          organizationId,
          contractNumber: `LC-DRV-${unique}`,
          status: 'active',
        })
        .returning();
      await db.insert(fleetVehicleAllocations).values({
        organizationId,
        contractId: contract.id,
        vehicleId: vehicle.id,
      });

      const match = await findAssignableVehicleInPages(
        app,
        accessToken,
        organizationId,
        (row) =>
          row.id === vehicle.id &&
          row.vehicleCode === vehicle.registrationNo &&
          row.activeLeaseId === contract.id,
      );
      expect(match).toBeDefined();
    });

    it('lists assignable vehicles on active contracts without allocation rows', async () => {
      const unique = Date.now();
      const expiry = new Date('2028-12-31T00:00:00.000Z');
      const [vehicle] = await db
        .insert(fleetVehicles)
        .values({
          organizationId,
          vin: `VINCV${unique}`,
          registrationNo: `VH-CV-${unique}`,
          registrationExpiry: expiry,
          insuranceExpiry: expiry,
          assetClass: 'SUV — Test',
          status: 'leased',
        })
        .returning();
      const [contract] = await db
        .insert(leaseContracts)
        .values({
          organizationId,
          contractNumber: `LC-DRV-CV-${unique}`,
          status: 'active',
        })
        .returning();
      await db.insert(leaseContractVehicles).values({
        contractId: contract.id,
        vehicleId: vehicle.id,
      });

      const match = await findAssignableVehicleInPages(
        app,
        accessToken,
        organizationId,
        (row) =>
          row.vehicleCode === vehicle.registrationNo &&
          row.activeLeaseId === contract.id,
      );
      expect(match).toBeDefined();
    });

    it('assigns, unassigns, and marks inactive when tied to contract', async () => {
      const unique = Date.now();
      const expiry = new Date('2028-12-31T00:00:00.000Z');
      const [vehicle] = await db
        .insert(fleetVehicles)
        .values({
          organizationId,
          vin: `VINUA${unique}`,
          registrationNo: `VH-UA-${unique}`,
          registrationExpiry: expiry,
          insuranceExpiry: expiry,
          assetClass: 'Van — Test',
          status: 'leased',
        })
        .returning();
      const [contract] = await db
        .insert(leaseContracts)
        .values({
          organizationId,
          contractNumber: `LC-DRV-UA-${unique}`,
          status: 'active',
        })
        .returning();
      await db.insert(fleetVehicleAllocations).values({
        organizationId,
        contractId: contract.id,
        vehicleId: vehicle.id,
      });

      const driverId = await createDriverAsAdmin();
      await request(app.getHttpServer())
        .post(`/api/v1/organisation/drivers/${driverId}/assign`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          vehicleCode: vehicle.registrationNo,
          assetClass: vehicle.assetClass,
          activeLeaseId: contract.id,
          vehicleTiedToContract: true,
        })
        .expect(200);

      const unassignRes = await request(app.getHttpServer())
        .post(`/api/v1/organisation/drivers/${driverId}/unassign`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);
      const unassigned = unassignRes.body as {
        assignedVehicle?: string;
        status: string;
        isActive: boolean;
      };
      expect(unassigned.assignedVehicle).toBeUndefined();
      expect(unassigned.status).toBe('inactive');
      expect(unassigned.isActive).toBe(false);

      const auditRow = await expectAuditLog(db, {
        action: 'organisation.driver.unassign',
        resourceId: driverId,
        organizationId,
      });
      expect(auditRow.resourceType).toBe('organisation_driver');
    });

    it('returns 400 when unassigning driver with no vehicle', async () => {
      const id = await createDriverAsAdmin();
      await request(app.getHttpServer())
        .post(`/api/v1/organisation/drivers/${id}/unassign`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(400);
    });

    it('returns 400 when assigning with expired license', async () => {
      const id = await createDriverAsAdmin();
      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/drivers/${id}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ action: 'activate' })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/drivers/${id}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ licenseExpiry: '2020-01-01' })
        .expect(200);

      await request(app.getHttpServer())
        .post(`/api/v1/organisation/drivers/${id}/assign`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          vehicleCode: 'VH-NOPE',
          assetClass: 'Sedan',
          activeLeaseId: '00000000-0000-4000-8000-000000000001',
        })
        .expect(400);
    });

    it('clears driver assignment when lease contract is deactivated', async () => {
      const unique = Date.now();
      const expiry = new Date('2028-12-31T00:00:00.000Z');
      const [vehicle] = await db
        .insert(fleetVehicles)
        .values({
          organizationId,
          vin: `VIN-DC-${unique}`,
          registrationNo: `VH-DC-${unique}`,
          registrationExpiry: expiry,
          insuranceExpiry: expiry,
          assetClass: 'Van — Test',
          status: 'leased',
        })
        .returning();
      const [contract] = await db
        .insert(leaseContracts)
        .values({
          organizationId,
          contractNumber: `LC-DRV-DC-${unique}`,
          status: 'active',
        })
        .returning();
      await db.insert(fleetVehicleAllocations).values({
        organizationId,
        contractId: contract.id,
        vehicleId: vehicle.id,
      });

      const driverId = await createDriverAsAdmin();
      await request(app.getHttpServer())
        .post(`/api/v1/organisation/drivers/${driverId}/assign`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          vehicleCode: vehicle.registrationNo,
          assetClass: vehicle.assetClass,
          activeLeaseId: contract.id,
          vehicleTiedToContract: true,
        })
        .expect(200);

      await request(app.getHttpServer())
        .post(`/api/v1/fleet-leasing/lease-contracts/${contract.id}/deactivate`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ reason: 'Driver hook deactivate test' })
        .expect(201);

      const detailRes = await request(app.getHttpServer())
        .get(`/api/v1/organisation/drivers/${driverId}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);
      const detail = detailRes.body as {
        assignedVehicle?: string;
        isActive: boolean;
      };
      expect(detail.assignedVehicle).toBeUndefined();
      expect(detail.isActive).toBe(false);

      await expectAuditLog(db, {
        action: 'organisation.driver.unassign',
        resourceId: driverId,
        organizationId,
      });
    });
  });
});
