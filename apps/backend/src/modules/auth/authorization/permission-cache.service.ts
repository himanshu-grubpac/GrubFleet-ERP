import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../infrastructure/redis/redis.tokens';

const DEFAULT_TTL_SEC = 300;
const CACHE_PREFIX = 'erp:perms:v1';

@Injectable()
export class PermissionCacheService {
  private readonly logger = new Logger(PermissionCacheService.name);
  private readonly ttlSec: number;

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {
    this.ttlSec = DEFAULT_TTL_SEC;
  }

  private cacheKey(
    userId: string,
    organizationId: string,
    revision: number,
  ): string {
    return `${CACHE_PREFIX}:${userId}:${organizationId}:r${revision}`;
  }

  private revisionKey(organizationId: string): string {
    return `${CACHE_PREFIX}:rev:${organizationId}`;
  }

  async getOrgRevision(organizationId: string): Promise<number> {
    try {
      if (this.redis.status !== 'ready') {
        await this.redis.connect();
      }
      const raw = await this.redis.get(this.revisionKey(organizationId));
      return raw ? parseInt(raw, 10) : 0;
    } catch (err) {
      this.logger.warn(
        `Redis revision read failed for org ${organizationId}: ${String(err)}`,
      );
      return 0;
    }
  }

  async bumpOrgRevision(organizationId: string): Promise<void> {
    try {
      if (this.redis.status !== 'ready') {
        await this.redis.connect();
      }
      await this.redis.incr(this.revisionKey(organizationId));
    } catch (err) {
      this.logger.warn(
        `Redis revision bump failed for org ${organizationId}: ${String(err)}`,
      );
    }
  }

  async getCachedPermissionKeys(
    userId: string,
    organizationId: string,
    revision: number,
  ): Promise<string[] | null> {
    try {
      if (this.redis.status !== 'ready') {
        await this.redis.connect();
      }
      const raw = await this.redis.get(
        this.cacheKey(userId, organizationId, revision),
      );
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return null;
      }
      return parsed.filter((k): k is string => typeof k === 'string');
    } catch (err) {
      this.logger.warn(`Redis permission cache read failed: ${String(err)}`);
      return null;
    }
  }

  async setCachedPermissionKeys(
    userId: string,
    organizationId: string,
    revision: number,
    keys: string[],
  ): Promise<void> {
    try {
      if (this.redis.status !== 'ready') {
        await this.redis.connect();
      }
      await this.redis.setex(
        this.cacheKey(userId, organizationId, revision),
        this.ttlSec,
        JSON.stringify(keys),
      );
    } catch (err) {
      this.logger.warn(`Redis permission cache write failed: ${String(err)}`);
    }
  }
}
