import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { LocationTypesController } from './location-types.controller';
import { LocationTypesService } from './location-types.service';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';
import { OrganisationRepository } from './repositories/organisation.repository';

@Module({
  imports: [AuditModule],
  controllers: [LocationTypesController, LocationsController],
  providers: [OrganisationRepository, LocationTypesService, LocationsService],
  exports: [LocationsService, LocationTypesService, OrganisationRepository],
})
export class OrganisationModule {}
