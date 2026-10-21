/// <reference types="jest" />

import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  bootstrapIntegrationAuth,
  ensureUserWithPermissions,
  loginAs,
  type IntegrationAuthContext,
} from '../../../test/helpers/integration-auth';

const ADMIN_VIEW_ONLY_USER = {
  email: 'portal-search.admin-viewer@grubpac.local',
  password: 'ViewerTest123!',
  fullName: 'Portal Search Admin Viewer',
  roleName: 'Portal Search Admin Viewer',
  permissionKeys: ['administration.view'],
} as const;

type PortalSearchResponse = {
  query: string;
  items: Array<{
    id: string;
    moduleKey: string;
    entityType: string;
    moduleLabel: string;
    entityTypeLabel: string;
  }>;
  meta: {
    totalReturned: number;
    limitPerType: number;
    capApplied: boolean;
    searchedModules: string[];
  };
};

describe('Portal search (integration)', () => {
  jest.setTimeout(60_000);

  if (process.env.SKIP_DB_INTEGRATION === '1') {
    it.todo('skipped when SKIP_DB_INTEGRATION=1');
    return;
  }

  let ctx: IntegrationAuthContext;
  let app: INestApplication<App>;
  let organizationId: string;
  let adminToken: string;
  let adminViewOnlyToken: string;

  beforeAll(async () => {
    ctx = await bootstrapIntegrationAuth();
    ({ app, organizationId } = ctx);
    adminToken = ctx.adminAccessToken;

    await ensureUserWithPermissions(
      ctx.db,
      organizationId,
      ADMIN_VIEW_ONLY_USER,
    );
    adminViewOnlyToken = await loginAs(
      app,
      ADMIN_VIEW_ONLY_USER.email,
      ADMIN_VIEW_ONLY_USER.password,
    );
  }, 90_000);

  afterAll(async () => {
    await ctx?.close();
  });

  it('GET /portal/search returns 401 without JWT', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/portal/search')
      .query({ organizationId, q: 'test' })
      .expect(401);
  });

  it('GET /portal/search returns 403 without organization context', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/portal/search')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ q: 'test' })
      .expect(403);
  });

  it('GET /portal/search returns 403 for foreign organizationId (IDOR-safe)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/portal/search')
      .set('Authorization', `Bearer ${ctx.orgViewOnlyAccessToken}`)
      .query({ organizationId: randomUUID(), q: 'test' })
      .expect(403);
  });

  it('GET /portal/search rejects unknown query keys with 400', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/portal/search')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ organizationId, q: 'test', unexpected: 'x' })
      .expect(400);
  });

  it('GET /portal/search returns 200 with RBAC-filtered modules for org viewer', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/portal/search')
      .set('Authorization', `Bearer ${ctx.orgViewOnlyAccessToken}`)
      .query({ organizationId, q: 'a', limitPerType: 2 })
      .expect(200);

    const body = res.body as PortalSearchResponse;
    expect(body.query).toBe('a');
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.meta.limitPerType).toBe(2);
    expect(body.meta.searchedModules).toEqual(['organisation']);
    for (const hit of body.items) {
      expect(hit.moduleKey).toBe('organisation');
      expect(hit.moduleLabel).toBe('Organisation');
      expect(hit.entityTypeLabel.length).toBeGreaterThan(0);
    }
  });

  it('GET /portal/search with administration.view only searches no ERP modules', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/portal/search')
      .set('Authorization', `Bearer ${adminViewOnlyToken}`)
      .query({ organizationId, q: 'admin' })
      .expect(200);

    const body = res.body as PortalSearchResponse;
    expect(body.meta.searchedModules).toEqual([]);
    expect(body.items).toEqual([]);
  });

  it('GET /portal/search returns multi-module hits for admin', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/portal/search')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ organizationId, q: 'a', limitPerType: 1 })
      .expect(200);

    const body = res.body as PortalSearchResponse;
    expect(body.meta.searchedModules.length).toBeGreaterThan(0);
    expect(body.meta.totalReturned).toBeLessThanOrEqual(50);
  });
});
