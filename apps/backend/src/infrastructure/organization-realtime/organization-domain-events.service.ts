import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';
import { StructuredLoggerService } from '../../common/logger/structured-logger.service';
import {
  orgDomainEventsRedisChannel,
  orgDomainEventsRevisionKey,
  type EmitOrganizationDomainEventInput,
  type OrganizationDomainEventPayload,
} from './organization-domain-event.types';
import { OrganizationRealtimeHubService } from './organization-realtime-hub.service';

@Injectable()
export class OrganizationDomainEventsService {
  private readonly localRevision = new Map<string, number>();

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly hub: OrganizationRealtimeHubService,
    private readonly logger: StructuredLoggerService,
  ) {}

  async emit(input: EmitOrganizationDomainEventInput): Promise<void> {
    const revision = await this.nextRevision(input.organizationId);
    const payload: OrganizationDomainEventPayload = {
      ...input,
      revision,
    };

    this.hub.publishLocal(payload);

    const channel = orgDomainEventsRedisChannel(input.organizationId);
    try {
      await this.redis.publish(channel, JSON.stringify(payload));
    } catch (err) {
      this.logger.warn(
        `Organization domain event Redis publish failed (${input.type}, org ${input.organizationId}): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  private async nextRevision(organizationId: string): Promise<number> {
    const key = orgDomainEventsRevisionKey(organizationId);
    try {
      const value = await this.redis.incr(key);
      return value;
    } catch {
      const next = (this.localRevision.get(organizationId) ?? 0) + 1;
      this.localRevision.set(organizationId, next);
      return next;
    }
  }
}
