import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { Subject, interval, merge, type Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import type { Env } from '../../config/env.schema';
import { StructuredLoggerService } from '../../common/logger/structured-logger.service';
import {
  ORG_DOMAIN_EVENTS_REDIS_CHANNEL_PREFIX,
  type OrganizationDomainEventPayload,
} from './organization-domain-event.types';
import {
  ORG_REALTIME_SSE_DEFAULT_MAX_CONNECTIONS_PER_ORG,
  ORG_REALTIME_SSE_HEARTBEAT_MS,
} from './organization-realtime.constants';

@Injectable()
export class OrganizationRealtimeHubService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly localSubjects = new Map<
    string,
    Subject<OrganizationDomainEventPayload>
  >();
  private readonly activeStreamConnections = new Map<string, number>();
  private maxConnectionsPerOrg = ORG_REALTIME_SSE_DEFAULT_MAX_CONNECTIONS_PER_ORG;
  private redisSubscriber: Redis | null = null;

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly logger: StructuredLoggerService,
  ) {
    this.maxConnectionsPerOrg = this.config.get(
      'ORG_REALTIME_SSE_MAX_CONNECTIONS_PER_ORG',
      { infer: true },
    );
  }

  /**
   * Registers one SSE consumer for an org. Returns release callback, or null when at cap.
   */
  tryRegisterStreamConnection(organizationId: string): (() => void) | null {
    const current = this.activeStreamConnections.get(organizationId) ?? 0;
    if (current >= this.maxConnectionsPerOrg) {
      return null;
    }
    this.activeStreamConnections.set(organizationId, current + 1);
    return () => {
      const next = (this.activeStreamConnections.get(organizationId) ?? 1) - 1;
      if (next <= 0) {
        this.activeStreamConnections.delete(organizationId);
      } else {
        this.activeStreamConnections.set(organizationId, next);
      }
    };
  }

  async onModuleInit(): Promise<void> {
    const url = this.config.get('REDIS_URL', { infer: true });
    try {
      this.redisSubscriber = new Redis(url, {
        maxRetriesPerRequest: 1,
        lazyConnect: true,
      });
      await this.redisSubscriber.connect();
      await this.redisSubscriber.psubscribe(
        `${ORG_DOMAIN_EVENTS_REDIS_CHANNEL_PREFIX}*`,
      );
      this.redisSubscriber.on('pmessage', (_pattern, channel, message) => {
        this.handleRedisMessage(channel, message);
      });
    } catch (err) {
      this.logger.warn(
        `Organization realtime Redis subscriber unavailable; SSE works on single node only: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      this.redisSubscriber = null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redisSubscriber) {
      await this.redisSubscriber.quit();
      this.redisSubscriber = null;
    }
    for (const subject of this.localSubjects.values()) {
      subject.complete();
    }
    this.localSubjects.clear();
  }

  publishLocal(event: OrganizationDomainEventPayload): void {
    const subject = this.getOrCreateSubject(event.organizationId);
    subject.next(event);
  }

  streamForOrganization(
    organizationId: string,
  ): Observable<{ data: OrganizationDomainEventPayload | { ping: true } }> {
    const subject = this.getOrCreateSubject(organizationId);
    const events$ = subject.pipe(
      filter((event) => event.organizationId === organizationId),
      map((event) => ({ data: event })),
    );
    const ping$ = interval(ORG_REALTIME_SSE_HEARTBEAT_MS).pipe(
      map(() => ({ data: { ping: true as const } })),
    );
    return merge(events$, ping$);
  }

  private handleRedisMessage(channel: string, raw: string): void {
    if (!channel.startsWith(ORG_DOMAIN_EVENTS_REDIS_CHANNEL_PREFIX)) {
      return;
    }
    const organizationId = channel.slice(
      ORG_DOMAIN_EVENTS_REDIS_CHANNEL_PREFIX.length,
    );
    if (!organizationId) {
      return;
    }
    try {
      const parsed = JSON.parse(raw) as OrganizationDomainEventPayload;
      if (parsed.organizationId !== organizationId) {
        return;
      }
      this.publishLocal(parsed);
    } catch {
      this.logger.warn(
        `Ignored malformed organization domain event on Redis channel ${channel}`,
      );
    }
  }

  private getOrCreateSubject(
    organizationId: string,
  ): Subject<OrganizationDomainEventPayload> {
    let subject = this.localSubjects.get(organizationId);
    if (!subject) {
      subject = new Subject<OrganizationDomainEventPayload>();
      this.localSubjects.set(organizationId, subject);
    }
    return subject;
  }
}
