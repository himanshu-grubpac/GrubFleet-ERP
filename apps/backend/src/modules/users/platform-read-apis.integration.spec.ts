import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  bootstrapIntegrationAuth,
  type IntegrationAuthContext,
} from '../../../test/helpers/integration-auth';

describe('Platform read APIs (integration)', () => {
  jest.setTimeout(60_000);

  if (process.env.SKIP_DB_INTEGRATION === '1') {
    it.todo('skipped when SKIP_DB_INTEGRATION=1');
    return;
  }

  let ctx: IntegrationAuthContext;
  let app: INestApplication<App>;
  let organizationId: string;
  let adminAccessToken: string;
  let orgViewOnlyAccessToken: string;

  beforeAll(async () => {
    ctx = await bootstrapIntegrationAuth();
    ({ app, organizationId, adminAccessToken, orgViewOnlyAccessToken } = ctx);
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('GET /organizations returns 401 without token', () => {
    return request(app.getHttpServer())
      .get('/api/v1/organizations')
      .expect(401);
  });

  it('GET /users returns 401 without token', () => {
    return request(app.getHttpServer()).get('/api/v1/users').expect(401);
  });

  it('GET /audit returns 401 without token', () => {
    return request(app.getHttpServer()).get('/api/v1/audit').expect(401);
  });

  it('GET /permissions returns 401 without token', () => {
    return request(app.getHttpServer())
      .get('/api/v1/permissions')
      .query({ page: 1, pageSize: 10 })
      .expect(401);
  });

  it('GET /modules returns 401 without token', () => {
    return request(app.getHttpServer())
      .get('/api/v1/modules')
      .query({ organizationId })
      .expect(401);
  });

  it('GET /users returns 403 for member without administration.view', () => {
    return request(app.getHttpServer())
      .get('/api/v1/users')
      .query({ organizationId, page: 1, pageSize: 10 })
      .set('Authorization', `Bearer ${orgViewOnlyAccessToken}`)
      .set('x-organization-id', organizationId)
      .expect(403);
  });

  it('GET /audit returns 403 for member without administration.view', () => {
    return request(app.getHttpServer())
      .get('/api/v1/audit')
      .query({ organizationId, page: 1, pageSize: 10 })
      .set('Authorization', `Bearer ${orgViewOnlyAccessToken}`)
      .set('x-organization-id', organizationId)
      .expect(403);
  });

  it('GET /permissions returns 403 for member without administration.view', () => {
    return request(app.getHttpServer())
      .get('/api/v1/permissions')
      .query({ page: 1, pageSize: 10 })
      .set('Authorization', `Bearer ${orgViewOnlyAccessToken}`)
      .set('x-organization-id', organizationId)
      .expect(403);
  });

  it('GET /modules returns 403 for member without administration.view', () => {
    return request(app.getHttpServer())
      .get('/api/v1/modules')
      .query({ organizationId })
      .set('Authorization', `Bearer ${orgViewOnlyAccessToken}`)
      .set('x-organization-id', organizationId)
      .expect(403);
  });

  it('GET /users returns 200 for admin with administration.view', () => {
    return request(app.getHttpServer())
      .get('/api/v1/users')
      .query({ organizationId, page: 1, pageSize: 10 })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
  });

  it('GET /permissions returns 200 for admin with administration.view', () => {
    return request(app.getHttpServer())
      .get('/api/v1/permissions')
      .query({ page: 1, pageSize: 10 })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
  });

  it('GET /modules returns 200 for admin with administration.view', () => {
    return request(app.getHttpServer())
      .get('/api/v1/modules')
      .query({ organizationId })
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .set('x-organization-id', organizationId)
      .expect(200);
  });
});
