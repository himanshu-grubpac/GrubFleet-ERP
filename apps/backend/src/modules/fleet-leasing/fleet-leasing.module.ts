import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { OrganisationModule } from '../organisation/organisation.module';
import { AssetRegisterModule } from '../asset-register/asset-register.module';
import { AssetClassesController } from './asset-classes.controller';
import { FleetClientsController } from './fleet-clients.controller';
import { FleetClientsService } from './fleet-clients.service';
import { FleetVehiclesController } from './fleet-vehicles.controller';
import { FleetReturnsController } from './fleet-returns.controller';
import { FleetReturnsService } from './fleet-returns.service';
import { LeaseContractsController } from './lease-contracts.controller';
import { RenewalsExtensionsController } from './renewals-extensions.controller';
import { LeaseContractsService } from './lease-contracts.service';
import { FleetLeasingRepository } from './repositories/fleet-leasing.repository';
import { VehicleAllocationsController } from './vehicle-allocations.controller';
import { VehicleAllocationsService } from './vehicle-allocations.service';

@Module({
  imports: [
    AuditModule,
    forwardRef(() => OrganisationModule),
    forwardRef(() => AssetRegisterModule),
  ],
  controllers: [
    LeaseContractsController,
    RenewalsExtensionsController,
    VehicleAllocationsController,
    FleetReturnsController,
    AssetClassesController,
    FleetClientsController,
    FleetVehiclesController,
  ],
  providers: [
    FleetLeasingRepository,
    LeaseContractsService,
    FleetClientsService,
    VehicleAllocationsService,
    FleetReturnsService,
  ],
  exports: [
    LeaseContractsService,
    FleetClientsService,
    FleetLeasingRepository,
    VehicleAllocationsService,
  ],
})
export class FleetLeasingModule {}
