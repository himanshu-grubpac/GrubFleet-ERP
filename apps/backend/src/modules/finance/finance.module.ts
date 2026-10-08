import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AssetRegisterModule } from '../asset-register/asset-register.module';
import { FleetLeasingModule } from '../fleet-leasing/fleet-leasing.module';
import { OrganisationModule } from '../organisation/organisation.module';
import { FinanceRepository } from './repositories/finance.repository';
import { ClientStatementsController } from './client-statements.controller';
import { ClientStatementsService } from './client-statements.service';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { InventoryPartsController } from './inventory-parts.controller';
import { InventoryPartsService } from './inventory-parts.service';
import { VendorPaymentsController } from './vendor-payments.controller';
import { VendorPaymentsService } from './vendor-payments.service';

@Module({
  imports: [
    AuditModule,
    AssetRegisterModule,
    forwardRef(() => OrganisationModule),
    forwardRef(() => FleetLeasingModule),
  ],
  controllers: [
    InvoicesController,
    InventoryPartsController,
    ClientStatementsController,
    VendorPaymentsController,
  ],
  providers: [
    FinanceRepository,
    InvoicesService,
    InventoryPartsService,
    ClientStatementsService,
    VendorPaymentsService,
  ],
  exports: [FinanceRepository, InvoicesService],
})
export class FinanceModule {}
