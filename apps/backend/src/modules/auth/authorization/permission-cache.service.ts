import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../infrastructure/redis/redis.tokens';

const DEFAULT_TTL_SEC = 300;
const CACHE_PREFIX = 'erp:perms:v1';

@Injectable()
export class PermissionCacheService {
  private readonly logger = new Logger(PermissionCacheService.name);
  private readonly ttlSec: number;
  /** Fallback when Redis is unavailable (single-process dev); synced with Redis when connected. */
  private readonly localOrgRevision = new Map<string, number>();

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

  private userCacheKeyPattern(userId: string, organizationId: string): string {
    return `${CACHE_PREFIX}:${userId}:${organizationId}:r*`;
  }

  async getOrgRevision(organizationId: string): Promise<number> {
    const local = this.localOrgRevision.get(organizationId) ?? 0;
    try {
      if (this.redis.status !== 'ready') {
        await this.redis.connect();
      }
      const raw = await this.redis.get(this.revisionKey(organizationId));
      const fromRedis = raw ? parseInt(raw, 10) : 0;
      const effective = Math.max(local, fromRedis);
      if (effective > local) {
        this.localOrgRevision.set(organizationId, effective);
      }
      return effective;
    } catch (err) {
      this.logger.warn(
        `Redis revision read failed for org ${organizationId}: ${String(err)}`,
      );
      return local;
    }
  }

  async bumpOrgRevision(organizationId: string): Promise<number> {
    const bumpedLocal = (this.localOrgRevision.get(organizationId) ?? 0) + 1;
    this.localOrgRevision.set(organizationId, bumpedLocal);
    try {
      if (this.redis.status !== 'ready') {
        await this.redis.connect();
      }
      const fromRedis = await this.redis.incr(this.revisionKey(organizationId));
      const effective = Math.max(bumpedLocal, fromRedis);
      this.localOrgRevision.set(organizationId, effective);
      return effective;
    } catch (err) {
      this.logger.warn(
        `Redis revision bump failed for org ${organizationId}: ${String(err)}`,
      );
      return bumpedLocal;
    }
  }

  async invalidateCachedPermissionKeysForUsers(
    userIds: string[],
    organizationId: string,
  ): Promise<void> {
    const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
    if (uniqueUserIds.length === 0) {
      return;
    }
    try {
      if (this.redis.status !== 'ready') {
        await this.redis.connect();
      }
      for (const userId of uniqueUserIds) {
        const pattern = this.userCacheKeyPattern(userId, organizationId);
        let cursor = '0';
        do {
          const [nextCursor, keys] = await this.redis.scan(
            cursor,
            'MATCH',
            pattern,
            'COUNT',
            100,
          );
          cursor = nextCursor;
          if (keys.length > 0) {
            await this.redis.del(...keys);
          }
        } while (cursor !== '0');
      }
    } catch (err) {
      this.logger.warn(
        `Redis permission cache invalidation failed for org ${organizationId}: ${String(err)}`,
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
