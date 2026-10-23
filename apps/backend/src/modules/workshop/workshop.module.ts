import { Module, forwardRef } from '@nestjs/common';
import { FleetLeasingModule } from '../fleet-leasing/fleet-leasing.module';
import { AuditModule } from '../audit/audit.module';
import { AssetRegisterModule } from '../asset-register/asset-register.module';
import { InventoryModule } from '../inventory/inventory.module';
import { OrganisationModule } from '../organisation/organisation.module';
import { LaborJobCardsController } from './labor-job-cards.controller';
import { LaborJobCardsService } from './labor-job-cards.service';
import { WorkshopRepository } from './repositories/workshop.repository';
import { WorkOrdersController } from './work-orders.controller';
import { WorkOrdersService } from './work-orders.service';
import { WorkshopAmcController } from './workshop-amc.controller';
import { WorkshopAmcService } from './workshop-amc.service';
import { WorkshopTechniciansController } from './workshop-technicians.controller';

@Module({
  imports: [
    AuditModule,
    InventoryModule,
    AssetRegisterModule,
    OrganisationModule,
    forwardRef(() => FleetLeasingModule),
  ],
  controllers: [
    LaborJobCardsController,
    WorkOrdersController,
    WorkshopTechniciansController,
    WorkshopAmcController,
  ],
  providers: [
    WorkshopRepository,
    LaborJobCardsService,
    WorkOrdersService,
    WorkshopAmcService,
  ],
  exports: [WorkshopRepository, LaborJobCardsService, WorkOrdersService],
})
export class WorkshopModule {}
