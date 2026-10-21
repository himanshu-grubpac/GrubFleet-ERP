import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { Env } from '../../config/env.schema';
import { REDIS_CLIENT } from '../../infrastructure/redis/redis.tokens';
import {
  LOGIN_RATE_LIMIT_MAX,
  LOGIN_RATE_LIMIT_WINDOW_SEC,
} from './constants/auth.constants';

@Injectable()
export class LoginRateLimiterService {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly configService: ConfigService<Env, true>,
  ) {}

  async assertAllowed(
    email: string,
    ipAddress: string | undefined,
  ): Promise<void> {
    // Integration tests share one Redis and parallel workers; counting logins would 429.
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    const key = `auth:login:${email.toLowerCase()}:${ipAddress ?? 'unknown'}`;
    try {
      if (this.redis.status !== 'ready') {
        await this.redis.connect();
      }
      const count = await this.redis.incr(key);
      if (count === 1) {
        await this.redis.expire(key, LOGIN_RATE_LIMIT_WINDOW_SEC);
      }
      if (count > LOGIN_RATE_LIMIT_MAX) {
        throw new HttpException(
          {
            message: 'Too many login attempts. Try again later.',
            code: 'LOGIN_RATE_LIMITED',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      if (this.shouldFailClosedWhenRedisUnavailable()) {
        throw new HttpException(
          {
            message: 'Login is temporarily unavailable. Try again later.',
            code: 'LOGIN_RATE_LIMIT_UNAVAILABLE',
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      // Development only: fail open when Redis is unavailable.
    }
  }

  /** Production tiers fail closed on Redis errors; local dev may proceed without throttling. */
  private shouldFailClosedWhenRedisUnavailable(): boolean {
    const appEnv = this.configService.get('APP_ENV', { infer: true });
    return appEnv !== 'development';
  }
}
