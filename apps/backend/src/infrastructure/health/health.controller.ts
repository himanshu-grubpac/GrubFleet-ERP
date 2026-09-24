import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { sql } from 'drizzle-orm';
import Redis from 'ioredis';
import { Pool } from 'pg';
import type { AppDatabase } from '../../database/database.module';
import { DRIZZLE, PG_POOL } from '../../database/drizzle.tokens';
import { REDIS_CLIENT } from '../redis/redis.tokens';

@ApiTags('health')
@Public()
@Controller('health')
export class HealthController {
  constructor(
    @Inject(DRIZZLE) private readonly db: AppDatabase,
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Liveness probe' })
  liveness(): { status: string; service: string } {
    return { status: 'ok', service: 'grubpac-erp-backend' };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe (PostgreSQL + Redis)' })
  async readiness(): Promise<{
    status: string;
    checks: Record<string, string>;
  }> {
    const checks: Record<string, string> = {};

    try {
      await this.pool.query('SELECT 1');
      checks.database = 'up';
    } catch {
      checks.database = 'down';
    }

    try {
      if (this.redis.status !== 'ready') {
        await this.redis.connect();
      }
      const pong = await this.redis.ping();
      checks.redis = pong === 'PONG' ? 'up' : 'down';
    } catch {
      checks.redis = 'down';
    }

    try {
      await this.db.execute(sql`SELECT 1`);
      checks.drizzle = 'up';
    } catch {
      checks.drizzle = 'down';
    }

    const allUp = Object.values(checks).every((v) => v === 'up');
    if (!allUp) {
      throw new ServiceUnavailableException({
        message: 'Dependency check failed',
        code: 'NOT_READY',
        details: checks,
      });
    }

    return { status: 'ready', checks };
  }
}
