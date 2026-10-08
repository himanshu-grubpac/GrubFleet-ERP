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
import * as schema from '../../database/schema';

const NO_ORG_PERMISSION_USER = {
  email: 'org-clients.viewer@grubpac.local',
  password: 'ViewerTest123!',
  fullName: 'Org Clients Viewer Only',
  roleName: 'Org Clients Viewer Only',
  permissionKeys: ['administration.view'],
} as const;

type ClientDetail = {
  id: string;
  isActive: boolean;
  status: string;
  contractHistory: unknown[];
};

describe('Organisation clients (integration)', () => {
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
  let viewerToken: string;
  let orgViewOnlyToken: string;

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
  }, 90000);

  afterAll(async () => {
    await ctx?.close();
  });

  function buildClientCreatePayload(
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> {
    const unique = Date.now();
    return {
      organizationId,
      clientName: `Lattice Client ${unique}`,
      addressLine1: 'Line 1',
      addressCountry: 'IN',
      addressState: 'Maharashtra',
      addressDistrict: 'Mumbai',
      addressPincode: '400001',
      pointsOfContact: [
        {
          name: 'Primary Contact',
          contactNumber: '+919888877770',
          email: `client.${unique}@grubpac.local`,
          isPrimary: true,
        },
      ],
      ...overrides,
    };
  }

  async function createClientAsAdmin(): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/organisation/clients')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send(buildClientCreatePayload())
      .expect(201);
    return (res.body as ClientDetail).id;
  }

  describe('security lattice — clients', () => {
    it('returns 401 without JWT on list and create', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/organisation/clients')
        .query({ organizationId })
        .expect(401);
      await request(app.getHttpServer())
        .post('/api/v1/organisation/clients')
        .set('x-organization-id', organizationId)
        .send(buildClientCreatePayload())
        .expect(401);
    });

    it('returns 403 without organisation permission on list', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/organisation/clients')
        .query({ organizationId, page: 1, pageSize: 10 })
        .set('Authorization', `Bearer ${viewerToken}`)
        .set('x-organization-id', organizationId)
        .expect(403);
    });

    it('allows organisation.view list but returns 403 on create, patch, and status', async () => {
      const id = await createClientAsAdmin();

      await request(app.getHttpServer())
        .get('/api/v1/organisation/clients')
        .query({ organizationId, page: 1, pageSize: 10 })
        .set('Authorization', `Bearer ${orgViewOnlyToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/v1/organisation/clients')
        .set('Authorization', `Bearer ${orgViewOnlyToken}`)
        .set('x-organization-id', organizationId)
        .send(buildClientCreatePayload())
        .expect(403);

      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/clients/${id}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${orgViewOnlyToken}`)
        .set('x-organization-id', organizationId)
        .send({ clientName: 'View Only Cannot Rename' })
        .expect(403);

      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/clients/${id}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${orgViewOnlyToken}`)
        .set('x-organization-id', organizationId)
        .send({ action: 'deactivate', reason: 'View only attempt' })
        .expect(403);
    });

    it('returns 403 when organisation context is missing on list', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/organisation/clients')
        .query({ page: 1, pageSize: 10 })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);
    });

    it('returns 403 or 404 on PATCH with another organisation id (IDOR)', async () => {
      const id = await createClientAsAdmin();
      const fakeOrgId = '00000000-0000-4000-8000-000000000099';
      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/clients/${id}`)
        .query({ organizationId: fakeOrgId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', fakeOrgId)
        .send({ clientName: 'Cross Org Rename' })
        .expect((res) => expect([403, 404]).toContain(res.status));
    });

    it('returns 403 or 404 on GET with another organisation id (IDOR)', async () => {
      const id = await createClientAsAdmin();
      const fakeOrgId = '00000000-0000-4000-8000-000000000099';
      await request(app.getHttpServer())
        .get(`/api/v1/organisation/clients/${id}`)
        .query({ organizationId: fakeOrgId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', fakeOrgId)
        .expect((res) => expect([403, 404]).toContain(res.status));
    });

    it('returns 400 for unknown JSON key on create', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/organisation/clients')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send(buildClientCreatePayload({ hackField: 'x' }))
        .expect(400);
    });

    it('returns 400 for unknown JSON key on PATCH', async () => {
      const id = await createClientAsAdmin();
      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/clients/${id}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ clientName: 'Valid Name', hackField: 'x' })
        .expect(400);
    });

    it('returns 403 when organisation context is missing on create', async () => {
      // organisationId intentionally omitted — org context comes from header guard
      const { organizationId: _organizationIdOmit, ...bodyWithoutOrg } =
        buildClientCreatePayload();
      void _organizationIdOmit;
      await request(app.getHttpServer())
        .post('/api/v1/organisation/clients')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(bodyWithoutOrg)
        .expect(403);
    });

    it('returns 400 when pageSize exceeds max', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/organisation/clients')
        .query({ organizationId, page: 1, pageSize: 51 })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(400);
    });

    it('returns 400 when PATCH on inactive client', async () => {
      const id = await createClientAsAdmin();
      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/clients/${id}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ action: 'deactivate', reason: 'For inactive edit test' })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/clients/${id}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ clientName: 'Cannot Edit Inactive' })
        .expect(400);
    });

    it('returns 400 when deactivating inactive client', async () => {
      const id = await createClientAsAdmin();
      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/clients/${id}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ action: 'deactivate', reason: 'First deactivate' })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/clients/${id}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ action: 'deactivate', reason: 'Again' })
        .expect(400);
    });

    it('writes an audit row on deactivate', async () => {
      const id = await createClientAsAdmin();
      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/clients/${id}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ action: 'deactivate', reason: 'Audit lattice closure' })
        .expect(200);

      const row = await expectAuditLog(db, {
        action: 'organisation.client.deactivate',
        resourceId: id,
        organizationId,
      });
      expect(row.resourceType).toBe('organisation_client');
      expect(row.metadata).toEqual({ reason: 'Audit lattice closure' });
    });

    it('returns 400 for invalid addressCountry on create', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/organisation/clients')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send(buildClientCreatePayload({ addressCountry: 'ZZ' }))
        .expect(400);
    });

    it('returns 400 when addressLine1 exceeds max length', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/organisation/clients')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send(buildClientCreatePayload({ addressLine1: 'x'.repeat(256) }))
        .expect(400);
    });

    it('returns 400 when no primary POC on create', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/organisation/clients')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send(
          buildClientCreatePayload({
            pointsOfContact: [
              {
                name: 'No Primary',
                contactNumber: '+919888877771',
                email: 'noprimary@grubpac.local',
                isPrimary: false,
              },
            ],
          }),
        )
        .expect(400);
    });

    it('returns empty contractHistory when no fleet client link exists', async () => {
      const id = await createClientAsAdmin();
      const res = await request(app.getHttpServer())
        .get(`/api/v1/organisation/clients/${id}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);
      const body = res.body as ClientDetail & {
        linkedFleetClientId?: string;
      };
      expect(body.contractHistory).toEqual([]);
      expect(body.isActive).toBe(true);
      expect(body.linkedFleetClientId).toMatch(/^[0-9a-f-]{36}$/i);
    });

    it('organisation client appears in fleet leasing client list after create', async () => {
      const unique = `FleetPickerSync ${Date.now()}`;
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/organisation/clients')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send(
          buildClientCreatePayload({
            clientName: unique,
          }),
        )
        .expect((res) => expect([200, 201]).toContain(res.status));
      const created = createRes.body as ClientDetail & {
        linkedFleetClientId?: string;
      };
      expect(created.linkedFleetClientId).toBeTruthy();

      const fleetList = await request(app.getHttpServer())
        .get('/api/v1/fleet-leasing/clients')
        .query({ organizationId, search: unique, page: 1, pageSize: 50 })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);
      const fleetBody = fleetList.body as {
        items: Array<{ id: string; companyName: string }>;
      };
      expect(
        fleetBody.items.some((row) => row.id === created.linkedFleetClientId),
      ).toBe(true);
      expect(
        fleetBody.items.some((row) => row.companyName.includes(unique)),
      ).toBe(true);
    });

    it('returns contract count and history when fleet client links organisation client', async () => {
      const id = await createClientAsAdmin();
      const unique = Date.now();
      const [fleetClient] = await db
        .insert(schema.fleetClients)
        .values({
          organizationId,
          clientCode: `OC-LINK-${unique}`,
          companyName: `Linked Fleet ${unique}`,
          organisationClientId: id,
        })
        .returning();
      const [contract] = await db
        .insert(schema.leaseContracts)
        .values({
          organizationId,
          contractNumber: `LC-OC-${unique}`,
          clientId: fleetClient.id,
          status: 'active',
        })
        .returning();
      await db.insert(schema.leaseContractAssetLines).values({
        contractId: contract.id,
        assetClass: 'Test Class',
        committedQuantity: 1,
        ratePerVehicleMonth: '1000.00',
        sortOrder: 0,
      });

      const listRes = await request(app.getHttpServer())
        .get('/api/v1/organisation/clients')
        .query({ organizationId, page: 1, pageSize: 50 })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);
      const listBody = listRes.body as {
        items: Array<{ id: string; contracts: number }>;
      };
      const listRow = listBody.items.find((row) => row.id === id);
      expect(listRow?.contracts).toBe(1);

      const detailRes = await request(app.getHttpServer())
        .get(`/api/v1/organisation/clients/${id}`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);
      const detail = detailRes.body as ClientDetail & {
        contractCount: number;
        contractHistory: Array<{
          assetClasses: string;
          status: string;
        }>;
      };
      expect(detail.contractCount).toBe(1);
      expect(detail.contractHistory).toHaveLength(1);
      expect(detail.contractHistory[0]?.assetClasses).toContain('Test Class');
      expect(detail.contractHistory[0]?.status).toBe('Active');
    });

    it('lists only inactive clients when status=inactive', async () => {
      const id = await createClientAsAdmin();
      await request(app.getHttpServer())
        .patch(`/api/v1/organisation/clients/${id}/status`)
        .query({ organizationId })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .send({ action: 'deactivate', reason: 'Inactive filter test' })
        .expect(200);

      const inactiveRes = await request(app.getHttpServer())
        .get('/api/v1/organisation/clients')
        .query({ organizationId, page: 1, pageSize: 50, status: 'inactive' })
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', organizationId)
        .expect(200);
      const inactiveBody = inactiveRes.body as {
        items: Array<{ id: string; status: string }>;
      };
      expect(inactiveBody.items.some((row) => row.id === id)).toBe(true);
      expect(inactiveBody.items.every((row) => row.status === 'inactive')).toBe(
        true,
      );
    });
  });
});
