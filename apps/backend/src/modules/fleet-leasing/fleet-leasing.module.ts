import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AssetClassesController } from './asset-classes.controller';
import { FleetClientsController } from './fleet-clients.controller';
import { FleetClientsService } from './fleet-clients.service';
import { FleetVehiclesController } from './fleet-vehicles.controller';
import { LeaseContractsController } from './lease-contracts.controller';
import { LeaseContractsService } from './lease-contracts.service';
import { FleetLeasingRepository } from './repositories/fleet-leasing.repository';

@Module({
  imports: [AuditModule],
  controllers: [
    LeaseContractsController,
    AssetClassesController,
    FleetClientsController,
    FleetVehiclesController,
  ],
  providers: [
    FleetLeasingRepository,
    LeaseContractsService,
    FleetClientsService,
  ],
  exports: [LeaseContractsService, FleetClientsService, FleetLeasingRepository],
})
export class FleetLeasingModule {}
