import { HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';
import type { Env } from '../../config/env.schema';
import { LOGIN_RATE_LIMIT_MAX } from './constants/auth.constants';
import { LoginRateLimiterService } from './login-rate-limiter.service';

function createService(
  redis: Pick<Redis, 'status' | 'connect' | 'incr' | 'expire'>,
  appEnv: 'development' | 'staging' | 'production',
): LoginRateLimiterService {
  const configService = {
    get: (key: string) => (key === 'APP_ENV' ? appEnv : undefined),
  } as unknown as ConfigService<Env, true>;
  return new LoginRateLimiterService(redis as Redis, configService);
}

describe('LoginRateLimiterService', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('fail-open on Redis error when APP_ENV is development', async () => {
    process.env.NODE_ENV = 'production';
    const redis = {
      status: 'ready',
      connect: jest.fn(),
      incr: jest.fn().mockRejectedValue(new Error('redis down')),
      expire: jest.fn(),
    };
    const service = createService(redis, 'development');
    await expect(
      service.assertAllowed('user@example.com', '127.0.0.1'),
    ).resolves.toBeUndefined();
  });

  it('fail-closed on Redis error when APP_ENV is production', async () => {
    process.env.NODE_ENV = 'production';
    const redis = {
      status: 'ready',
      connect: jest.fn(),
      incr: jest.fn().mockRejectedValue(new Error('redis down')),
      expire: jest.fn(),
    };
    const service = createService(redis, 'production');
    await expect(
      service.assertAllowed('user@example.com', '127.0.0.1'),
    ).rejects.toMatchObject({
      status: HttpStatus.SERVICE_UNAVAILABLE,
      response: {
        code: 'LOGIN_RATE_LIMIT_UNAVAILABLE',
      },
    });
  });

  it('rethrows HttpException when rate limit exceeded', async () => {
    process.env.NODE_ENV = 'production';
    const redis = {
      status: 'ready',
      connect: jest.fn(),
      incr: jest.fn().mockResolvedValue(LOGIN_RATE_LIMIT_MAX + 1),
      expire: jest.fn(),
    };
    const service = createService(redis, 'production');
    await expect(
      service.assertAllowed('user@example.com', '127.0.0.1'),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it('skips limiting when NODE_ENV is test', async () => {
    process.env.NODE_ENV = 'test';
    const redis = {
      status: 'ready',
      connect: jest.fn(),
      incr: jest.fn().mockRejectedValue(new Error('should not be called')),
      expire: jest.fn(),
    };
    const service = createService(redis, 'production');
    await expect(
      service.assertAllowed('user@example.com', '127.0.0.1'),
    ).resolves.toBeUndefined();
    expect(redis.incr).not.toHaveBeenCalled();
  });
});
