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

const WORKSHOP_VIEWER = {
  email: 'workshop.viewer@grubpac.local',
  password: 'ViewerTest123!',
  fullName: 'Workshop Viewer Only',
  roleName: 'Workshop Viewer Only',
  permissionKeys: ['workshop.view'],
} as const;

describe('Workshop module (integration)', () => {
  jest.setTimeout(90_000);

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
  let sparePartId: string;
  let vehicleId: string;
  let locationId: string;
  let technicianEmployeeId: string;

  beforeAll(async () => {
    ctx = await bootstrapIntegrationAuth();
    ({ app, db, organizationId } = ctx);
    accessToken = ctx.adminAccessToken;

    await ensureUserWithPermissions(db, organizationId, WORKSHOP_VIEWER);
    viewerToken = await loginAs(
      app,
      WORKSHOP_VIEWER.email,
      WORKSHOP_VIEWER.password,
    );

    const partRes = await request(app.getHttpServer())
      .post('/api/v1/inventory/stock-register')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        name: `Workshop Spec Part ${Date.now()}`,
        compatibleAssetClasses: ['Test class'],
        unitOfMeasure: 'Each',
        retailMarkupPercent: 10,
        wholesaleMarkupPercent: 5,
        reorderThreshold: 2,
      })
      .expect(201);
    sparePartId = (partRes.body as { id: string }).id;

    const locationsRes = await request(app.getHttpServer())
      .get('/api/v1/organisation/locations')
      .query({ organizationId, page: 1, pageSize: 1 })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
    locationId = (locationsRes.body as { items: Array<{ id: string }> })
      .items[0]?.id;

    if (locationId) {
      await request(app.getHttpServer())
        .post('/api/v1/inventory/stock-receipts')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          partId: sparePartId,
          locationId,
          purchaseDate: '2026-02-01',
          quantityReceived: 50,
          quantityUnitCostMinor: 10000,
        })
        .expect(201);
    }

    const employeesRes = await request(app.getHttpServer())
      .get('/api/v1/organisation/employees')
      .query({ organizationId, page: 1, pageSize: 1 })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
    technicianEmployeeId = (
      employeesRes.body as { items: Array<{ id: string }> }
    ).items[0]?.id;
    if (technicianEmployeeId) {
      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/employees/${technicianEmployeeId}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ isWorkshopTechnician: true })
        .expect(200);
    }

    const vehiclesRes = await request(app.getHttpServer())
      .get('/api/v1/asset-register/vehicles')
      .query({ organizationId, page: 1, pageSize: 1 })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
    vehicleId = (vehiclesRes.body as { items: Array<{ id: string }> }).items[0]
      ?.id;
  }, 120_000);

  afterAll(async () => {
    await ctx?.close();
  });

  describe('auth lattice', () => {
    it('returns 401 without token on labor job card list', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/workshop/labor-job-cards')
        .query({ organizationId, page: 1, pageSize: 10 })
        .expect(401);
    });

    it('returns 401 without token on work order create', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/workshop/work-orders')
        .send({
          organizationId,
          vehicleId: '00000000-0000-4000-8000-000000000001',
          issueDescription: 'No auth',
        })
        .expect(401);
    });

    it('returns 403 when organization id omitted on technicians list', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/workshop/technicians')
        .query({ page: 1, pageSize: 10 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect((response) => {
          expect([400, 403]).toContain(response.status);
        });
    });

    it('returns 401 without token on AMC tier list', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/workshop/amc/tiers')
        .query({ organizationId, page: 1, pageSize: 10 })
        .expect(401);
    });

    it('returns 403 when viewer creates labor job card', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/workshop/labor-job-cards')
        .set('Authorization', `Bearer ${viewerToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          name: 'Viewer blocked card',
          laborChargeMinor: 10000,
        })
        .expect(403);
    });
  });

  describe('labor job cards', () => {
    let laborJobCardId: string;

    it('returns 400 on create with unknown JSON key', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/workshop/labor-job-cards')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          name: 'Unknown key card',
          laborChargeMinor: 1000,
          unexpectedField: true,
        })
        .expect(400);
    });

    it('creates labor job card with parts', async () => {
      const unique = Date.now();
      const res = await request(app.getHttpServer())
        .post('/api/v1/workshop/labor-job-cards')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          name: `Oil service ${unique}`,
          description: 'Template for integration',
          laborChargeMinor: 25000,
          parts: [{ partId: sparePartId, quantity: 2 }],
        })
        .expect(201);
      const body = res.body as {
        id: string;
        name: string;
        laborChargeMinor: number;
        parts: Array<{ partId: string; quantity: number }>;
      };
      laborJobCardId = body.id;
      expect(body.name).toBe(`Oil service ${unique}`);
      expect(body.laborChargeMinor).toBe(25000);
      expect(
        body.parts.some(
          (line) => line.partId === sparePartId && line.quantity === 2,
        ),
      ).toBe(true);
    });

    it('lists labor job cards', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/workshop/labor-job-cards')
        .query({ organizationId, page: 1, pageSize: 20 })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);
      const body = res.body as { items: Array<{ id: string }> };
      expect(body.items.some((row) => row.id === laborJobCardId)).toBe(true);
    });

    it('gets labor job card detail', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/workshop/labor-job-cards/${laborJobCardId}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);
    });
  });

  describe('work orders (create skeleton)', () => {
    it('creates work order when fleet vehicle exists', async () => {
      if (!vehicleId) {
        console.warn(
          'Skipping work order create — no asset register vehicle in org',
        );
        return;
      }
      const cardRes = await request(app.getHttpServer())
        .post('/api/v1/workshop/labor-job-cards')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          name: `WO template ${Date.now()}`,
          laborChargeMinor: 5000,
          parts: [{ partId: sparePartId, quantity: 1 }],
        })
        .expect(201);
      const laborJobCardId = (cardRes.body as { id: string }).id;

      const res = await request(app.getHttpServer())
        .post('/api/v1/workshop/work-orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          vehicleId,
          laborJobCardId,
          issueDescription: 'Integration work order',
          expectedCompletionDate: '2026-12-01',
        })
        .expect(201);

      const orderBody = res.body as {
        id: string;
        status: string;
        vehicle: { id: string } | null;
        netTotalMinor: number;
        partsFulfillmentSummary?: string;
        partLines: Array<{ fulfillmentStatus: string }>;
      };
      expect(orderBody.status).toBe('open');
      expect(orderBody.vehicle?.id).toBe(vehicleId);
      expect(typeof orderBody.netTotalMinor).toBe('number');
      if (locationId) {
        expect(orderBody.partsFulfillmentSummary).toBe('reserved');
        expect(orderBody.partLines[0]?.fulfillmentStatus).toBe('reserved');
      }

      const listRes = await request(app.getHttpServer())
        .get('/api/v1/workshop/work-orders')
        .query({ organizationId, page: 1, pageSize: 20 })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);
      const listBody = listRes.body as { items: Array<{ id: string }> };
      expect(listBody.items.some((row) => row.id === orderBody.id)).toBe(true);

      const detailRes = await request(app.getHttpServer())
        .get(`/api/v1/workshop/work-orders/${orderBody.id}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);

      const patchRes = await request(app.getHttpServer())
        .patch(`/api/v1/workshop/work-orders/${orderBody.id}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ issueDescription: 'Updated issue' })
        .expect(200);
      expect(
        (patchRes.body as { issueDescription: string }).issueDescription,
      ).toBe('Updated issue');

      if (technicianEmployeeId) {
        await request(app.getHttpServer())
          .patch(`/api/v1/workshop/work-orders/${orderBody.id}`)
          .query({ organizationId })
          .set('Authorization', `Bearer ${accessToken}`)
          .set('x-organization-id', organizationId)
          .send({ technicianEmployeeId })
          .expect(200);
      }

      await request(app.getHttpServer())
        .patch(`/api/v1/workshop/work-orders/${orderBody.id}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ action: 'start' })
        .expect(technicianEmployeeId ? 200 : 400);

      if (technicianEmployeeId) {
        const afterStart = await request(app.getHttpServer())
          .get(`/api/v1/workshop/work-orders/${orderBody.id}`)
          .query({ organizationId })
          .set('Authorization', `Bearer ${accessToken}`)
          .set('x-organization-id', organizationId)
          .expect(200);
        expect(
          (afterStart.body as { partsFulfillmentSummary: string })
            .partsFulfillmentSummary,
        ).toBe(locationId ? 'issued' : 'none');

        await request(app.getHttpServer())
          .patch(`/api/v1/workshop/work-orders/${orderBody.id}/status`)
          .query({ organizationId })
          .set('Authorization', `Bearer ${accessToken}`)
          .set('x-organization-id', organizationId)
          .send({ action: 'close' })
          .expect(200);
      }

      expect(detailRes.body).toBeDefined();
    });

    it('returns 403 or 404 on work order GET with foreign org (IDOR)', async () => {
      if (!vehicleId) return;
      const cardRes = await request(app.getHttpServer())
        .post('/api/v1/workshop/labor-job-cards')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          name: `IDOR template ${Date.now()}`,
          laborChargeMinor: 1000,
        })
        .expect(201);
      const laborJobCardId = (cardRes.body as { id: string }).id;
      const woRes = await request(app.getHttpServer())
        .post('/api/v1/workshop/work-orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          vehicleId,
          laborJobCardId,
          issueDescription: 'IDOR test order',
        })
        .expect(201);
      const workOrderId = (woRes.body as { id: string }).id;
      const fakeOrgId = '00000000-0000-4000-8000-000000000099';
      const res = await request(app.getHttpServer())
        .get(`/api/v1/workshop/work-orders/${workOrderId}`)
        .query({ organizationId: fakeOrgId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', fakeOrgId)
        .expect((response) => {
          expect([403, 404]).toContain(response.status);
        });
      expect(res.body).toBeDefined();
    });

    it('lists all active workshop technicians (paginated)', async () => {
      expect(locationId).toBeDefined();

      const unique = Date.now();
      const createTechnician = async (suffix: string) => {
        const res = await request(app.getHttpServer())
          .post('/api/v1/organisation/employees')
          .set('Authorization', `Bearer ${accessToken}`)
          .set('x-organization-id', organizationId)
          .send({
            organizationId,
            fullName: `Workshop Tech ${suffix} ${unique}`,
            designation: 'Technician',
            department: 'Workshop',
            locationId,
            employmentType: 'full_time',
            dateOfJoining: '2024-06-01',
            phone: `+9198${String(unique).slice(-8)}${suffix === 'A' ? '1' : '2'}`,
            email: `workshop.tech.${suffix.toLowerCase()}.${unique}@grubpac.local`,
            isWorkshopTechnician: true,
          })
          .expect(201);
        return (res.body as { id: string }).id;
      };

      const techAId = await createTechnician('A');
      const techBId = await createTechnician('B');

      const pageOne = await request(app.getHttpServer())
        .get('/api/v1/workshop/technicians')
        .query({ organizationId, page: 1, pageSize: 1 })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);
      const pageOneBody = pageOne.body as {
        items: Array<{ employeeId: string }>;
        total: number;
        totalPages: number;
      };
      expect(pageOneBody.items).toHaveLength(1);
      expect(pageOneBody.total).toBeGreaterThanOrEqual(2);
      expect(pageOneBody.totalPages).toBeGreaterThanOrEqual(2);

      const pageTwo = await request(app.getHttpServer())
        .get('/api/v1/workshop/technicians')
        .query({ organizationId, page: 2, pageSize: 1 })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);
      const pageTwoBody = pageTwo.body as {
        items: Array<{ employeeId: string }>;
      };
      expect(pageTwoBody.items).toHaveLength(1);
      expect(pageOneBody.items[0]?.employeeId).not.toBe(
        pageTwoBody.items[0]?.employeeId,
      );

      const allRes = await request(app.getHttpServer())
        .get('/api/v1/workshop/technicians')
        .query({ organizationId, page: 1, pageSize: 200 })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);
      const allBody = allRes.body as {
        items: Array<{ employeeId: string }>;
      };
      const listedIds = new Set(allBody.items.map((row) => row.employeeId));
      expect(listedIds.has(techAId)).toBe(true);
      expect(listedIds.has(techBId)).toBe(true);
    });
  });

  async function createAmcSubscribeTestVehicle(): Promise<string> {
    const unique = Date.now();
    const classRes = await request(app.getHttpServer())
      .post('/api/v1/asset-register/asset-classes')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        brand: 'Workshop AMC',
        modelName: `AMC model ${unique}`,
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
    const classId = (classRes.body as { id: string }).id;

    const vehicleRes = await request(app.getHttpServer())
      .post('/api/v1/asset-register/vehicles')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        assetClassId: classId,
        registrationNumber: `WS-AMC-${unique}`.slice(0, 32),
        chassisNumber: `CH-WS-AMC-${unique}`,
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
    return (vehicleRes.body as { id: string }).id;
  }

  describe('AMC tiers and schedules', () => {
    it('returns 403 when viewer creates AMC subscriber', async () => {
      if (!vehicleId) return;
      const tierRes = await request(app.getHttpServer())
        .post('/api/v1/workshop/amc/tiers')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          name: `Viewer block tier ${Date.now()}`,
        })
        .expect(201);
      const tierId = (tierRes.body as { id: string }).id;

      await request(app.getHttpServer())
        .post('/api/v1/workshop/amc/subscribers')
        .set('Authorization', `Bearer ${viewerToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          amcTierId: tierId,
          vehicleId,
        })
        .expect(403);
    });

    it('creates AMC tier via POST', async () => {
      const unique = Date.now();
      const res = await request(app.getHttpServer())
        .post('/api/v1/workshop/amc/tiers')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          name: `Tier ${unique}`,
          description: 'Integration tier',
        })
        .expect(201);
      expect((res.body as { name: string }).name).toBe(`Tier ${unique}`);
    });

    it('creates and updates maintenance schedule', async () => {
      const unique = Date.now();
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/workshop/amc/schedules')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          name: `Schedule ${unique}`,
          assetClassLabel: 'Test class',
          intervalLabel: '4000 km',
        })
        .expect(201);
      const scheduleId = (createRes.body as { id: string }).id;

      await request(app.getHttpServer())
        .patch(`/api/v1/workshop/amc/schedules/${scheduleId}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ intervalLabel: '5000 km' })
        .expect(200);
    });

    it('lists schedule vehicles, detects threshold, and auto-creates PM work order', async () => {
      const subscribeVehicleId = await createAmcSubscribeTestVehicle();
      const classRes = await request(app.getHttpServer())
        .get('/api/v1/asset-register/vehicles')
        .query({ organizationId, page: 1, pageSize: 50 })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);
      const vehicleRow = (
        classRes.body as {
          items: Array<{ id: string; assetClassName: string }>;
        }
      ).items.find((row) => row.id === subscribeVehicleId);
      expect(vehicleRow?.assetClassName).toBeDefined();

      const unique = Date.now();
      const scheduleRes = await request(app.getHttpServer())
        .post('/api/v1/workshop/amc/schedules')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          name: `PM schedule ${unique}`,
          assetClassLabel: vehicleRow!.assetClassName,
          intervalLabel: '5000 km',
          intervalType: 'Odometer',
        })
        .expect(201);
      const scheduleId = (scheduleRes.body as { id: string }).id;

      await request(app.getHttpServer())
        .patch(`/api/v1/asset-register/vehicles/${subscribeVehicleId}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ odometer: 5000 })
        .expect(200);

      const listRes = await request(app.getHttpServer())
        .get(`/api/v1/workshop/amc/schedules/${scheduleId}/vehicles`)
        .query({ organizationId, page: 1, pageSize: 50 })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);

      const items = (
        listRes.body as {
          items: Array<{
            vehicleId: string;
            thresholdStatus: string;
            pmWorkOrderId: string | null;
          }>;
        }
      ).items;
      const matched = items.find((row) => row.vehicleId === subscribeVehicleId);
      expect(matched?.thresholdStatus).toBe('threshold_reached');
      expect(matched?.pmWorkOrderId).toBeTruthy();

      const woRes = await request(app.getHttpServer())
        .get(`/api/v1/workshop/work-orders/${matched!.pmWorkOrderId as string}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);
      const woBody = woRes.body as {
        workOrderType: string;
        workOrderSource: string;
        status: string;
        statusBanner: { level: string } | null;
      };
      expect(woBody.workOrderType).toBe('pm');
      expect(woBody.workOrderSource).toBe('maintenance_schedule');
      expect(woBody.status).toBe('open');
      expect(woBody.statusBanner?.level).toBe('info');
    });

    it('returns 401 without token on schedule vehicles list', async () => {
      await request(app.getHttpServer())
        .get(
          `/api/v1/workshop/amc/schedules/00000000-0000-4000-8000-000000000001/vehicles`,
        )
        .query({ organizationId, page: 1, pageSize: 10 })
        .expect(401);
    });

    it('subscribes vehicle to AMC tier', async () => {
      const subscribeVehicleId = await createAmcSubscribeTestVehicle();
      const unique = Date.now();
      const tierRes = await request(app.getHttpServer())
        .post('/api/v1/workshop/amc/tiers')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          name: `Subscribe tier ${unique}`,
        })
        .expect(201);
      const tierId = (tierRes.body as { id: string }).id;

      const subRes = await request(app.getHttpServer())
        .post('/api/v1/workshop/amc/subscribers')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          amcTierId: tierId,
          vehicleId: subscribeVehicleId,
        })
        .expect(201);
      expect((subRes.body as { amcTierId: string }).amcTierId).toBe(tierId);
    });

    it('deactivates AMC tier and blocks update while inactive', async () => {
      const unique = Date.now();
      const tierRes = await request(app.getHttpServer())
        .post('/api/v1/workshop/amc/tiers')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          name: `Deactivate tier ${unique}`,
        })
        .expect(201);
      const tierId = (tierRes.body as { id: string }).id;

      await request(app.getHttpServer())
        .patch(`/api/v1/workshop/amc/tiers/${tierId}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ action: 'deactivate', reason: 'Integration test' })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/v1/workshop/amc/tiers/${tierId}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ name: 'Should fail' })
        .expect(400);

      await expectAuditLog(db, {
        action: 'workshop.amc_tier.deactivate',
        resourceId: tierId,
        organizationId,
      });
    });

    it('returns 403 or 404 on AMC tier GET with foreign org (IDOR)', async () => {
      const unique = Date.now();
      const tierRes = await request(app.getHttpServer())
        .post('/api/v1/workshop/amc/tiers')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          name: `IDOR tier ${unique}`,
        })
        .expect(201);
      const tierId = (tierRes.body as { id: string }).id;
      const fakeOrgId = '00000000-0000-4000-8000-000000000099';

      await request(app.getHttpServer())
        .get(`/api/v1/workshop/amc/tiers/${tierId}`)
        .query({ organizationId: fakeOrgId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', fakeOrgId)
        .expect((response) => {
          expect([403, 404]).toContain(response.status);
        });
    });
  });

  describe('labor job card lifecycle', () => {
    it('deactivates labor job card and blocks update while inactive', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/workshop/labor-job-cards')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({
          organizationId,
          name: `Deactivate me ${Date.now()}`,
          laborChargeMinor: 1000,
        })
        .expect(201);
      const cardId = (createRes.body as { id: string }).id;

      await request(app.getHttpServer())
        .patch(`/api/v1/workshop/labor-job-cards/${cardId}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ action: 'deactivate', reason: 'Integration test' })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/v1/workshop/labor-job-cards/${cardId}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ name: 'Should fail' })
        .expect(400);

      await expectAuditLog(db, {
        action: 'workshop.labor_job_card.deactivate',
        resourceId: cardId,
        organizationId,
      });
    });
  });
});
