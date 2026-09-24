import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { AppModule } from '../../app.module';
import { GlobalHttpExceptionFilter } from '../../common/filters/http-exception.filter';
import {
  DEV_ADMIN_EMAIL,
  DEV_ADMIN_PASSWORD,
  seedDevAdminBootstrap,
} from '../../database/seed/dev-admin-bootstrap';
import { ensureTestSchema } from '../../../test/helpers/ensure-test-schema';
import * as schema from '../../database/schema';

const describeIfDb =
  process.env.SKIP_DB_INTEGRATION === '1' ? describe.skip : describe;

describeIfDb('Auth (integration)', () => {
  let app: INestApplication<App>;
  let pool: Pool;

  beforeAll(async () => {
    const connectionString =
      process.env.DATABASE_URL ??
      'postgresql://grubpac:grubpac_dev@localhost:5432/grubpac_erp';
    pool = new Pool({ connectionString });

    try {
      await pool.query('SELECT 1');
    } catch {
      pool.end().catch(() => undefined);
      throw new Error('PostgreSQL not available for auth integration tests');
    }

    await ensureTestSchema();
    await seedDevAdminBootstrap(drizzle(pool, { schema }));

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new GlobalHttpExceptionFilter());
    await app.init();
  }, 60000);

  afterAll(async () => {
    await pool?.end();
    await app?.close();
  });

  it('GET /auth/me returns 401 without token', () => {
    return request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
  });

  it('POST /auth/login issues tokens for dev admin', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: DEV_ADMIN_EMAIL, password: DEV_ADMIN_PASSWORD })
      .expect(201);

    const body = res.body as {
      accessToken: string;
      refreshToken: string;
      tokenType: string;
      expiresIn: number;
    };
    expect(body.accessToken).toEqual(expect.any(String));
    expect(body.refreshToken).toEqual(expect.any(String));
    expect(body.tokenType).toBe('Bearer');
    expect(body.expiresIn).toBeGreaterThan(0);

    const me = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${body.accessToken}`)
      .expect(200);

    const meBody = me.body as {
      user: { email: string };
      permissionKeys: string[];
    };
    expect(meBody.user.email).toBe(DEV_ADMIN_EMAIL);
    expect(meBody.permissionKeys.length).toBeGreaterThan(0);

    const refreshed = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: body.refreshToken })
      .expect(201);

    const refreshBody = refreshed.body as {
      accessToken: string;
      refreshToken: string;
    };
    expect(refreshBody.refreshToken).not.toBe(body.refreshToken);

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${refreshBody.accessToken}`)
      .send({ refreshToken: refreshBody.refreshToken })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: refreshBody.refreshToken })
      .expect(401);
  });
});
