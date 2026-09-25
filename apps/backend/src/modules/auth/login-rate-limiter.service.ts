import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../infrastructure/redis/redis.tokens';
import {
  LOGIN_RATE_LIMIT_MAX,
  LOGIN_RATE_LIMIT_WINDOW_SEC,
} from './constants/auth.constants';

@Injectable()
export class LoginRateLimiterService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async assertAllowed(
    email: string,
    ipAddress: string | undefined,
  ): Promise<void> {
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
      // Fail open when Redis is unavailable so auth still works in degraded mode.
    }
  }
}
