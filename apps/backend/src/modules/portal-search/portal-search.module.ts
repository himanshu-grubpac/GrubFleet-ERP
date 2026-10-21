import { Module } from '@nestjs/common';
import { AssetRegisterModule } from '../asset-register/asset-register.module';
import { FinanceModule } from '../finance/finance.module';
import { FleetLeasingModule } from '../fleet-leasing/fleet-leasing.module';
import { InventoryModule } from '../inventory/inventory.module';
import { OrganisationModule } from '../organisation/organisation.module';
import { WorkshopModule } from '../workshop/workshop.module';
import { PortalSearchController } from './portal-search.controller';
import { PortalSearchService } from './portal-search.service';

@Module({
  imports: [
    OrganisationModule,
    FleetLeasingModule,
    AssetRegisterModule,
    FinanceModule,
    InventoryModule,
    WorkshopModule,
  ],
  controllers: [PortalSearchController],
  providers: [PortalSearchService],
})
export class PortalSearchModule {}
