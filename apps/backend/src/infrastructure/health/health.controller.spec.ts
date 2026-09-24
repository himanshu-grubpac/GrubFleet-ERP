import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { DRIZZLE, PG_POOL } from '../../database/drizzle.tokens';
import { REDIS_CLIENT } from '../redis/redis.tokens';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: DRIZZLE,
          useValue: { execute: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: PG_POOL,
          useValue: {
            query: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }),
          },
        },
        {
          provide: REDIS_CLIENT,
          useValue: {
            status: 'ready',
            ping: jest.fn().mockResolvedValue('PONG'),
            connect: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(HealthController);
  });

  it('returns liveness payload', () => {
    expect(controller.liveness()).toEqual({
      status: 'ok',
      service: 'grubpac-erp-backend',
    });
  });

  it('returns readiness when dependencies are up', async () => {
    await expect(controller.readiness()).resolves.toMatchObject({
      status: 'ready',
    });
  });
});
