import { Global, Module } from '@nestjs/common';
import { OrganizationDomainEventsService } from './organization-domain-events.service';
import { OrganizationRealtimeController } from './organization-realtime.controller';
import { OrganizationRealtimeHubService } from './organization-realtime-hub.service';

@Global()
@Module({
  controllers: [OrganizationRealtimeController],
  providers: [OrganizationRealtimeHubService, OrganizationDomainEventsService],
  exports: [OrganizationDomainEventsService],
})
export class OrganizationRealtimeModule {}
