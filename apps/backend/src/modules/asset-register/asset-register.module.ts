import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { FleetLeasingModule } from '../fleet-leasing/fleet-leasing.module';
import { OrganisationModule } from '../organisation/organisation.module';
import { AssetRegisterCatalogService } from './asset-register-catalog.service';
import { AssetRegisterAssignmentsController } from './asset-register-assignments.controller';
import { AssetRegisterAssignmentsService } from './asset-register-assignments.service';
import { AssetRegisterCatalogController } from './asset-register-catalog.controller';
import { AssetRegisterComplianceController } from './asset-register-compliance.controller';
import { AssetRegisterComplianceService } from './asset-register-compliance.service';
import { AssetClassesController } from './asset-classes.controller';
import { AssetClassesService } from './asset-classes.service';
import { AssetRegisterVehiclesController } from './asset-register-vehicles.controller';
import { AssetRegisterVehiclesService } from './asset-register-vehicles.service';
import { AssetRegisterRepository } from './repositories/asset-register.repository';

@Module({
  imports: [
    AuditModule,
    OrganisationModule,
    forwardRef(() => FleetLeasingModule),
  ],
  controllers: [
    AssetClassesController,
    AssetRegisterVehiclesController,
    AssetRegisterAssignmentsController,
    AssetRegisterComplianceController,
    AssetRegisterCatalogController,
  ],
  providers: [
    AssetRegisterRepository,
    AssetClassesService,
    AssetRegisterVehiclesService,
    AssetRegisterAssignmentsService,
    AssetRegisterComplianceService,
    AssetRegisterCatalogService,
  ],
  exports: [
    AssetRegisterRepository,
    AssetClassesService,
    AssetRegisterVehiclesService,
    AssetRegisterAssignmentsService,
    AssetRegisterComplianceService,
    AssetRegisterCatalogService,
  ],
})
export class AssetRegisterModule {}
