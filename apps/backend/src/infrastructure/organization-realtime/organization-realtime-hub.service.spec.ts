import { ConfigService } from '@nestjs/config';
import { OrganizationRealtimeHubService } from './organization-realtime-hub.service';
import { StructuredLoggerService } from '../../common/logger/structured-logger.service';

describe('OrganizationRealtimeHubService connection limits', () => {
  function createHub(maxPerOrg: number) {
    const config = {
      get: (key: string) => {
        if (key === 'REDIS_URL') return 'redis://127.0.0.1:6379';
        if (key === 'ORG_REALTIME_SSE_MAX_CONNECTIONS_PER_ORG')
          return maxPerOrg;
        return undefined;
      },
    } as unknown as ConfigService;
    const logger = { warn: jest.fn() } as unknown as StructuredLoggerService;
    const hub = new OrganizationRealtimeHubService(config, logger);
    hub.onModuleInit = async () => {};
    return hub;
  }

  it('allows connections up to the per-org limit and releases on unregister', () => {
    const hub = createHub(2);
    const releaseA = hub.tryRegisterStreamConnection('org-1');
    const releaseB = hub.tryRegisterStreamConnection('org-1');
    expect(releaseA).not.toBeNull();
    expect(releaseB).not.toBeNull();
    expect(hub.tryRegisterStreamConnection('org-1')).toBeNull();

    releaseA?.();
    const releaseC = hub.tryRegisterStreamConnection('org-1');
    expect(releaseC).not.toBeNull();
    releaseB?.();
    releaseC?.();
  });

  it('tracks limits independently per organization', () => {
    const hub = createHub(1);
    expect(hub.tryRegisterStreamConnection('org-a')).not.toBeNull();
    expect(hub.tryRegisterStreamConnection('org-b')).not.toBeNull();
    expect(hub.tryRegisterStreamConnection('org-a')).toBeNull();
  });
});
