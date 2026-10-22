import { OrganizationDomainEventsService } from './organization-domain-events.service';
import { OrganizationRealtimeHubService } from './organization-realtime-hub.service';
import { OrganizationDomainEventType } from './organization-domain-event.types';
import { StructuredLoggerService } from '../../common/logger/structured-logger.service';

describe('OrganizationDomainEventsService', () => {
  it('increments revision, publishes locally, and publishes to Redis', async () => {
    const redis = {
      incr: jest.fn().mockResolvedValue(42),
      publish: jest.fn().mockResolvedValue(1),
    };
    const publishLocal = jest.fn();
    const hub = {
      publishLocal,
    } as unknown as OrganizationRealtimeHubService;
    const logger = {
      warn: jest.fn(),
    } as unknown as StructuredLoggerService;

    const service = new OrganizationDomainEventsService(
      redis as never,
      hub,
      logger,
    );

    await service.emit({
      type: OrganizationDomainEventType.ASSET_REGISTER_ASSIGNMENT_CHANGED,
      organizationId: 'org-1',
      resource: 'asset_register_vehicle_assignment',
      ids: { leaseContractId: 'contract-1', vehicleIds: ['v1'] },
    });

    expect(redis.incr).toHaveBeenCalledWith(
      'grubfleet:org-event-revision:org-1',
    );
    expect(publishLocal).toHaveBeenCalledWith(
      expect.objectContaining({
        type: OrganizationDomainEventType.ASSET_REGISTER_ASSIGNMENT_CHANGED,
        organizationId: 'org-1',
        revision: 42,
      }),
    );
    expect(redis.publish).toHaveBeenCalledWith(
      'grubfleet:org-events:org-1',
      expect.any(String),
    );
  });
});
