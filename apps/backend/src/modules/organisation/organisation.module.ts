import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { LocationTypesController } from './location-types.controller';
import { LocationTypesService } from './location-types.service';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';
import { OrganisationRepository } from './repositories/organisation.repository';

@Module({
  imports: [AuditModule],
  controllers: [
    LocationTypesController,
    LocationsController,
    EmployeesController,
  ],
  providers: [
    OrganisationRepository,
    LocationTypesService,
    LocationsService,
    EmployeesService,
  ],
  exports: [
    LocationsService,
    LocationTypesService,
    EmployeesService,
    OrganisationRepository,
  ],
})
export class OrganisationModule {}
