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
  email: 'asset.compliance.viewonly@grubpac.local',
  password: 'AssetComplianceView123!',
  fullName: 'Asset Compliance View Only',
  roleName: 'Asset Compliance View Only',
  permissionKeys: ['asset_register.view'],
} as const;

describe('Asset Register — compliance and renewals (integration)', () => {
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

  async function createVehicleWithDates(dates: {
    insuranceStartDate?: string;
    insuranceEndDate: string;
    registrationEndDate: string;
    warrantyEndDate: string;
  }): Promise<string> {
    const unique = Date.now();
    const classRes = await request(app.getHttpServer())
      .post('/api/v1/asset-register/asset-classes')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        name: `Compliance Class ${unique}`,
        vehicleType: '4W',
        fuelType: 'Diesel',
        fuelTankCapacity: 60,
        ratedLoadFrom: 500,
        ratedLoadTo: 1500,
      })
      .expect(201);
    const classId = (classRes.body as { id: string }).id;
    const masterRes = await request(app.getHttpServer())
      .post('/api/v1/asset-register/asset-masters')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        assetClassId: classId,
        name: `Compliance Master ${unique}`,
      })
      .expect(201);
    const masterId = (masterRes.body as { id: string }).id;

    const vehicleRes = await request(app.getHttpServer())
      .post('/api/v1/asset-register/vehicles')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        assetClassId: classId,
        assetMasterId: masterId,
        registrationNumber: `CMP-${unique}`.slice(0, 32),
        chassisNumber: `CH-CMP-${unique}`,
        modelYear: 2024,
        odometer: 0,
        registrationStartDate: '2024-01-01',
        registrationEndDate: dates.registrationEndDate,
        insuranceStartDate: dates.insuranceStartDate ?? '2024-01-01',
        insuranceEndDate: dates.insuranceEndDate,
        insurancePremium: 5000,
        warrantyStartDate: '2024-01-01',
        warrantyEndDate: dates.warrantyEndDate,
      })
      .expect(201);
    return (vehicleRes.body as { id: string }).id;
  }

  it('returns 401 without JWT on compliance list', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/asset-register/compliance')
      .query({ organizationId, page: 1, pageSize: 10 })
      .expect(401);
  });

  it('returns 403 for view-only on renew', async () => {
    const vehicleId = await createVehicleWithDates({
      insuranceEndDate: '2030-01-01',
      registrationEndDate: '2030-01-01',
      warrantyEndDate: '2030-01-01',
    });

    await request(app.getHttpServer())
      .post(`/api/v1/asset-register/compliance/${vehicleId}/renew`)
      .set('Authorization', `Bearer ${assetViewOnlyToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        type: 'insurance',
        startDate: '2026-01-01',
        endDate: '2027-01-01',
        insurancePremium: 8000,
      })
      .expect(403);
  });

  it('lists expired compliance and renews insurance', async () => {
    const vehicleId = await createVehicleWithDates({
      insuranceStartDate: '2019-01-01',
      insuranceEndDate: '2020-01-01',
      registrationEndDate: '2030-01-01',
      warrantyEndDate: '2030-01-01',
    });

    const listRes = await request(app.getHttpServer())
      .get('/api/v1/asset-register/compliance')
      .query({
        organizationId,
        page: 1,
        pageSize: 50,
        complianceStatus: 'expired',
      })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);

    const listBody = listRes.body as {
      items: Array<{ vehicleId: string; overallComplianceStatus: string }>;
    };
    expect(listBody.items.some((i) => i.vehicleId === vehicleId)).toBe(true);

    const renewRes = await request(app.getHttpServer())
      .post(`/api/v1/asset-register/compliance/${vehicleId}/renew`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        type: 'insurance',
        startDate: '2026-01-01',
        endDate: '2027-06-01',
        insurancePremium: 9500,
      })
      .expect(200);

    const renewed = renewRes.body as {
      insurance: { endDate: string; status: string; premium: string };
    };
    expect(renewed.insurance.endDate).toBe('2027-06-01');
    expect(renewed.insurance.status).toBe('valid');

    await expectAuditLog(db, {
      organizationId,
      action: 'asset_register_compliance.renew_insurance',
      resourceId: vehicleId,
    });
  });

  it('returns compliance detail for vehicle', async () => {
    const vehicleId = await createVehicleWithDates({
      insuranceEndDate: '2030-01-01',
      registrationEndDate: '2030-01-01',
      warrantyEndDate: '2030-01-01',
    });

    const res = await request(app.getHttpServer())
      .get(`/api/v1/asset-register/compliance/${vehicleId}`)
      .query({ organizationId })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);

    const body = res.body as {
      fleetCode: string;
      overallComplianceStatus: string;
    };
    expect(body.fleetCode).toMatch(/^VH-/);
    expect(body.overallComplianceStatus).toBe('valid');
  });
});
