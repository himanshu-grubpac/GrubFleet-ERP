import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PartsRequestsController } from './parts-requests.controller';
import { PartsRequestsService } from './parts-requests.service';
import { InventoryRepository } from './repositories/inventory.repository';
import { StockBalanceController } from './stock-balance.controller';
import { StockBalanceService } from './stock-balance.service';
import { StockReceiptsController } from './stock-receipts.controller';
import { StockReceiptsService } from './stock-receipts.service';
import { StockRegisterController } from './stock-register.controller';
import { StockRegisterService } from './stock-register.service';

@Module({
  imports: [AuditModule],
  controllers: [
    StockRegisterController,
    StockReceiptsController,
    StockBalanceController,
    PartsRequestsController,
  ],
  providers: [
    InventoryRepository,
    StockRegisterService,
    StockReceiptsService,
    StockBalanceService,
    PartsRequestsService,
  ],
  exports: [InventoryRepository],
})
export class InventoryModule {}
