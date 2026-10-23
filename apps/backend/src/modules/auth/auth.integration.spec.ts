import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { Pool } from 'pg';
import { AppModule } from '../../app.module';
import {
  DEV_ADMIN_EMAIL,
  DEV_ADMIN_PASSWORD,
  seedDevAdminBootstrap,
} from '../../database/seed/dev-admin-bootstrap';
import { ensureTestSchema } from '../../../test/helpers/ensure-test-schema';
import {
  closeIntegrationResources,
  configureIntegrationNestApp,
} from '../../../test/helpers/integration-auth';
import { expectAuditLog } from '../../../test/helpers/audit-assert';
import { AUTH_AUDIT_ACTIONS } from './constants/auth.constants';
import * as schema from '../../database/schema';
import type { AppDatabase } from '../../database/database.module';

describe('Auth (integration)', () => {
  jest.setTimeout(60_000);

  if (process.env.SKIP_DB_INTEGRATION === '1') {
    it.todo('skipped when SKIP_DB_INTEGRATION=1');
    return;
  }

  let app: INestApplication<App>;
  let pool: Pool;
  let db: AppDatabase;

  beforeAll(async () => {
    process.env.PASSWORD_RESET_EXPOSE_TOKEN_FOR_TESTS = '1';
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
    db = drizzle(pool, { schema });
    await seedDevAdminBootstrap(db);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureIntegrationNestApp(app);
    await app.init();
  }, 60000);

  afterAll(async () => {
    await closeIntegrationResources(app, pool);
  });

  it('GET /auth/me returns 401 without token', () => {
    return request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
  });

  it('GET /health sets Helmet security headers (AUD-002)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
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
      user: { id: string; email: string };
      permissionKeys: string[];
    };
    expect(meBody.user.email).toBe(DEV_ADMIN_EMAIL);
    expect(meBody.permissionKeys.length).toBeGreaterThan(0);
    const adminUserId = meBody.user.id;

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

    await expectAuditLog(db, {
      action: AUTH_AUDIT_ACTIONS.LOGOUT,
      resourceId: adminUserId,
    });

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: refreshBody.refreshToken })
      .expect(401);
  });

  it('POST /auth/change-password requires authentication', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/change-password')
      .send({
        currentPassword: DEV_ADMIN_PASSWORD,
        newPassword: 'NewSecure123!',
      })
      .expect(401);
  });

  it('password change and forgot/reset flows with audit and session revoke', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: DEV_ADMIN_EMAIL, password: DEV_ADMIN_PASSWORD })
      .expect(201);

    const { accessToken, refreshToken } = loginRes.body as {
      accessToken: string;
      refreshToken: string;
    };

    await request(app.getHttpServer())
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        currentPassword: 'WrongPassword1!',
        newPassword: 'AnotherNew123!',
      })
      .expect(401);

    const tempPassword = 'TempChange123!';
    await request(app.getHttpServer())
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        currentPassword: DEV_ADMIN_PASSWORD,
        newPassword: tempPassword,
      })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(401);

    const adminRow = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, DEV_ADMIN_EMAIL))
      .limit(1);
    const adminId = adminRow[0]?.id;
    if (!adminId) {
      throw new Error('dev admin user not found');
    }
    await expectAuditLog(db, {
      action: AUTH_AUDIT_ACTIONS.CHANGE_PASSWORD_SUCCESS,
      resourceId: adminId,
    });

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(401);

    const unknownForgot = await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'nobody@grubpac.local' })
      .expect(201);
    const unknownBody = unknownForgot.body as {
      message: string;
      resetToken?: string;
    };
    expect(unknownBody.message.length).toBeGreaterThan(0);
    expect(unknownBody.resetToken).toBeUndefined();

    const forgot = await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email: DEV_ADMIN_EMAIL })
      .expect(201);
    const resetToken = (forgot.body as { resetToken?: string }).resetToken;
    expect(resetToken).toEqual(expect.any(String));

    await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({ token: resetToken, newPassword: 'ResetFlow123!' })
      .expect(201);

    await expectAuditLog(db, {
      action: AUTH_AUDIT_ACTIONS.RESET_PASSWORD_SUCCESS,
      resourceId: adminId,
    });

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: DEV_ADMIN_EMAIL, password: 'ResetFlow123!' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({ token: resetToken, newPassword: 'ShouldFail123!' })
      .expect(400);

    const restoreLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: DEV_ADMIN_EMAIL, password: 'ResetFlow123!' })
      .expect(201);
    const restoreAccess = (restoreLogin.body as { accessToken: string })
      .accessToken;

    await request(app.getHttpServer())
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${restoreAccess}`)
      .send({
        currentPassword: 'ResetFlow123!',
        newPassword: DEV_ADMIN_PASSWORD,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email: DEV_ADMIN_EMAIL, extra: 'nope' })
      .expect(400);
  });
});
