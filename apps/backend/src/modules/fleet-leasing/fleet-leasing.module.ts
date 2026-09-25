import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AssetClassesController } from './asset-classes.controller';
import { FleetClientsController } from './fleet-clients.controller';
import { FleetClientsService } from './fleet-clients.service';
import { FleetVehiclesController } from './fleet-vehicles.controller';
import { FleetReturnsController } from './fleet-returns.controller';
import { FleetReturnsService } from './fleet-returns.service';
import { LeaseContractsController } from './lease-contracts.controller';
import { LeaseContractsService } from './lease-contracts.service';
import { FleetLeasingRepository } from './repositories/fleet-leasing.repository';
import { VehicleAllocationsController } from './vehicle-allocations.controller';
import { VehicleAllocationsService } from './vehicle-allocations.service';

@Module({
  imports: [AuditModule],
  controllers: [
    LeaseContractsController,
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
  exports: [LeaseContractsService, FleetClientsService, FleetLeasingRepository],
})
export class FleetLeasingModule {}
