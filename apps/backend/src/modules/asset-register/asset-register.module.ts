import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { FleetLeasingModule } from '../fleet-leasing/fleet-leasing.module';
import { AssetRegisterCatalogService } from './asset-register-catalog.service';
import { AssetRegisterAssignmentsController } from './asset-register-assignments.controller';
import { AssetRegisterAssignmentsService } from './asset-register-assignments.service';
import { AssetRegisterComplianceController } from './asset-register-compliance.controller';
import { AssetRegisterComplianceService } from './asset-register-compliance.service';
import { AssetClassesController } from './asset-classes.controller';
import { AssetClassesService } from './asset-classes.service';
import { AssetMastersController } from './asset-masters.controller';
import { AssetMastersService } from './asset-masters.service';
import { AssetRegisterVehiclesController } from './asset-register-vehicles.controller';
import { AssetRegisterVehiclesService } from './asset-register-vehicles.service';
import { AssetRegisterRepository } from './repositories/asset-register.repository';

@Module({
  imports: [AuditModule, forwardRef(() => FleetLeasingModule)],
  controllers: [
    AssetClassesController,
    AssetMastersController,
    AssetRegisterVehiclesController,
    AssetRegisterAssignmentsController,
    AssetRegisterComplianceController,
  ],
  providers: [
    AssetRegisterRepository,
    AssetClassesService,
    AssetMastersService,
    AssetRegisterVehiclesService,
    AssetRegisterAssignmentsService,
    AssetRegisterComplianceService,
    AssetRegisterCatalogService,
  ],
  exports: [
    AssetRegisterRepository,
    AssetClassesService,
    AssetMastersService,
    AssetRegisterVehiclesService,
    AssetRegisterAssignmentsService,
    AssetRegisterComplianceService,
    AssetRegisterCatalogService,
  ],
})
export class AssetRegisterModule {}
