import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { Env } from '../../config/env.schema';
import { REDIS_CLIENT } from '../../infrastructure/redis/redis.tokens';
import {
  CHANGE_PASSWORD_RATE_LIMIT_MAX,
  FORGOT_PASSWORD_RATE_LIMIT_MAX,
  LOGIN_RATE_LIMIT_MAX,
  LOGIN_RATE_LIMIT_WINDOW_SEC,
} from './constants/auth.constants';

export type AuthRateLimitScope =
  'login' | 'forgot_password' | 'change_password';

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
    return this.assertScopeAllowed('login', email, ipAddress);
  }

  async assertScopeAllowed(
    scope: AuthRateLimitScope,
    identifier: string,
    ipAddress: string | undefined,
  ): Promise<void> {
    // Integration tests share one Redis and parallel workers; counting logins would 429.
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    const max = this.maxForScope(scope);
    const key = `auth:${scope}:${identifier.toLowerCase()}:${ipAddress ?? 'unknown'}`;
    const { message, code, unavailableCode } = this.messagesForScope(scope);
    try {
      if (this.redis.status !== 'ready') {
        await this.redis.connect();
      }
      const count = await this.redis.incr(key);
      if (count === 1) {
        await this.redis.expire(key, LOGIN_RATE_LIMIT_WINDOW_SEC);
      }
      if (count > max) {
        throw new HttpException(
          { message, code },
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
            message: `${message.split('.')[0]}. Try again later.`,
            code: unavailableCode,
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      // Development only: fail open when Redis is unavailable.
    }
  }

  private maxForScope(scope: AuthRateLimitScope): number {
    switch (scope) {
      case 'forgot_password':
        return FORGOT_PASSWORD_RATE_LIMIT_MAX;
      case 'change_password':
        return CHANGE_PASSWORD_RATE_LIMIT_MAX;
      default:
        return LOGIN_RATE_LIMIT_MAX;
    }
  }

  private messagesForScope(scope: AuthRateLimitScope): {
    message: string;
    code: string;
    unavailableCode: string;
  } {
    switch (scope) {
      case 'forgot_password':
        return {
          message: 'Too many password reset requests. Try again later.',
          code: 'FORGOT_PASSWORD_RATE_LIMITED',
          unavailableCode: 'FORGOT_PASSWORD_RATE_LIMIT_UNAVAILABLE',
        };
      case 'change_password':
        return {
          message: 'Too many password change attempts. Try again later.',
          code: 'CHANGE_PASSWORD_RATE_LIMITED',
          unavailableCode: 'CHANGE_PASSWORD_RATE_LIMIT_UNAVAILABLE',
        };
      default:
        return {
          message: 'Too many login attempts. Try again later.',
          code: 'LOGIN_RATE_LIMITED',
          unavailableCode: 'LOGIN_RATE_LIMIT_UNAVAILABLE',
        };
    }
  }

  /** Production tiers fail closed on Redis errors; local dev may proceed without throttling. */
  private shouldFailClosedWhenRedisUnavailable(): boolean {
    const appEnv = this.configService.get('APP_ENV', { infer: true });
    return appEnv !== 'development';
  }
}
