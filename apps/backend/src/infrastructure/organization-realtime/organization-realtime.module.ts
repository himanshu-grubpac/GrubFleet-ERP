import { Global, Module } from '@nestjs/common';
import { StructuredLoggerService } from '../../common/logger/structured-logger.service';
import { OrganizationDomainEventsService } from './organization-domain-events.service';
import { OrganizationRealtimeController } from './organization-realtime.controller';
import { OrganizationRealtimeHubService } from './organization-realtime-hub.service';

@Global()
@Module({
  controllers: [OrganizationRealtimeController],
  providers: [
    StructuredLoggerService,
    OrganizationRealtimeHubService,
    OrganizationDomainEventsService,
  ],
  exports: [OrganizationDomainEventsService],
})
export class OrganizationRealtimeModule {}
