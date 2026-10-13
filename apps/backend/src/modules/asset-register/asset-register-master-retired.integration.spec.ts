/// <reference types="jest" />

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  bootstrapIntegrationAuth,
  type IntegrationAuthContext,
} from '../../../test/helpers/integration-auth';

describe('Asset Register — asset master HTTP retired (integration)', () => {
  jest.setTimeout(60_000);

  if (process.env.SKIP_DB_INTEGRATION === '1') {
    it.todo('skipped when SKIP_DB_INTEGRATION=1');
    return;
  }

  let ctx: IntegrationAuthContext;
  let app: INestApplication<App>;
  let organizationId: string;
  let accessToken: string;
  let classId: string;

  beforeAll(async () => {
    ctx = await bootstrapIntegrationAuth();
    ({ app, organizationId } = ctx);
    accessToken = ctx.adminAccessToken;

    const classRes = await request(app.getHttpServer())
      .post('/api/v1/asset-register/asset-classes')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        brand: 'Retired',
        modelName: 'master-route-test',
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
    classId = (classRes.body as { id: string }).id;
  }, 90000);

  afterAll(async () => {
    await ctx?.close();
  });

  it('returns 404 for legacy asset-masters collection', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/asset-register/asset-masters')
      .query({ organizationId, page: 1, pageSize: 10 })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(404);
  });

  it('returns 404 for legacy asset-masters create', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/asset-register/asset-masters')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        assetClassId: classId,
        name: 'Should not exist',
      })
      .expect(404);
  });

  it('returns 404 for legacy class masters catalog sub-route', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/asset-register/asset-classes/${classId}/masters`)
      .query({ organizationId, page: 1, pageSize: 10 })
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .expect(404);
  });

  it('returns 400 when vehicle create body includes retired assetMasterId', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/asset-register/vehicles')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        assetClassId: classId,
        assetMasterId: '11111111-1111-4111-8111-111111111111',
        registrationNumber: 'RETIRED-MASTER-FIELD',
        chassisNumber: 'CH-RETIRED-MASTER',
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
      .expect(400);
  });
});
