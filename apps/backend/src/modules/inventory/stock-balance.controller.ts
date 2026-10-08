import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequireOrganizationContext } from '../auth/authorization/decorators/require-organization-context.decorator';
import { RequirePermissions } from '../auth/authorization/decorators/require-permissions.decorator';
import { InventoryPermissionKeys } from './constants/inventory-permission-keys';
import { ListInventoryQueryDto } from './dto/list-inventory-query.dto';
import { StockBalanceService } from './stock-balance.service';

@ApiTags('inventory')
@ApiBearerAuth()
@Controller('inventory/stock-balance')
export class StockBalanceController {
  constructor(private readonly balance: StockBalanceService) {}

  @Get()
  @RequireOrganizationContext()
  @RequirePermissions(InventoryPermissionKeys.VIEW)
  @ApiOperation({ summary: 'List stock balance by part' })
  list(@Query() query: ListInventoryQueryDto) {
    return this.balance.list(query);
  }

  @Get(':id')
  @RequireOrganizationContext()
  @RequirePermissions(InventoryPermissionKeys.VIEW)
  @ApiOperation({ summary: 'Stock balance detail for a part' })
  getOne(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.balance.getById(organizationId, id);
  }
}
