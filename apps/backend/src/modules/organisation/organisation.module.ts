import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { FleetLeasingModule } from '../fleet-leasing/fleet-leasing.module';
import { LocationTypesController } from './location-types.controller';
import { LocationTypesService } from './location-types.service';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';
import { DriversController } from './drivers.controller';
import { DriversService } from './drivers.service';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { OrganisationRepository } from './repositories/organisation.repository';

@Module({
  imports: [AuditModule, forwardRef(() => FleetLeasingModule)],
  controllers: [
    LocationTypesController,
    LocationsController,
    EmployeesController,
    SuppliersController,
    ClientsController,
    DriversController,
  ],
  providers: [
    OrganisationRepository,
    LocationTypesService,
    LocationsService,
    EmployeesService,
    SuppliersService,
    ClientsService,
    DriversService,
  ],
  exports: [
    LocationsService,
    LocationTypesService,
    EmployeesService,
    SuppliersService,
    ClientsService,
    DriversService,
    OrganisationRepository,
  ],
})
export class OrganisationModule {}
