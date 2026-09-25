/// <reference types="jest" />

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import { AppModule } from '../../app.module';
import { GlobalHttpExceptionFilter } from '../../common/filters/http-exception.filter';
import {
  DEV_ADMIN_EMAIL,
  DEV_ADMIN_PASSWORD,
  DEV_ORG_SLUG,
  seedDevAdminBootstrap,
} from '../../database/seed/dev-admin-bootstrap';
import { ensureTestSchema } from '../../../test/helpers/ensure-test-schema';
import * as schema from '../../database/schema';
import { organizations } from '../../database/schema';

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
type FleetClientResponse = { id: string };
type PaginatedClientsResponse = { items: FleetClientResponse[] };
type LeaseContractDetailResponse = {
  rawStatus: string;
  client: { companyName: string } | null;
  availableActions: { editContract: { allowed: boolean } };
};

describe('Fleet leasing lease contracts (integration)', () => {
  if (process.env.SKIP_DB_INTEGRATION === '1') {
    it.todo('skipped when SKIP_DB_INTEGRATION=1');
    return;
  }

  let app: INestApplication<App>;
  let pool: Pool;
  let organizationId: string;
  let accessToken: string;

  beforeAll(async () => {
    const connectionString =
      process.env.DATABASE_URL ??
      'postgresql://grubpac:grubpac_dev@localhost:5432/grubpac_erp';
    pool = new Pool({ connectionString });
    await pool.query('SELECT 1');
    await ensureTestSchema();
    const db = drizzle(pool, { schema });
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
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.useGlobalFilters(new GlobalHttpExceptionFilter());
    app.setGlobalPrefix('api/v1');
    await app.init();
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: DEV_ADMIN_EMAIL, password: DEV_ADMIN_PASSWORD });
    const loginBody = login.body as AuthLoginResponse;
    accessToken = loginBody.accessToken;
  });

  afterAll(async () => {
    await app?.close();
    await pool?.end();
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

    const created = await request(app.getHttpServer())
      .post('/api/v1/fleet-leasing/lease-contracts')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({ organizationId })
      .expect((res) => {
        expect([200, 201]).toContain(res.status);
      });

    const createdBody = created.body as LeaseContractResponse;
    expect(createdBody.contractNumber).toMatch(/^LC-/);
    expect(createdBody.rawStatus).toBe('draft');

    const clientRes = await request(app.getHttpServer())
      .post('/api/v1/fleet-leasing/clients')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', organizationId)
      .send({
        organizationId,
        companyName: 'Meridian Logistics Pvt Ltd',
        address: 'Mumbai',
        pointsOfContact: [
          {
            name: 'Aditi Rao',
            contactNumber: '+919999999999',
            email: 'aditi@meridian.example',
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
});
