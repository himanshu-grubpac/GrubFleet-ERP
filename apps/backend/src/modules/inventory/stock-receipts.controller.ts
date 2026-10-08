import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireAnyPermissions } from '../auth/authorization/decorators/require-any-permissions.decorator';
import { RequireOrganizationContext } from '../auth/authorization/decorators/require-organization-context.decorator';
import { RequirePermissions } from '../auth/authorization/decorators/require-permissions.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import {
  InventoryPermissionKeys,
  InventoryWriteAny,
} from './constants/inventory-permission-keys';
import { CreateStockReceiptDto } from './dto/create-stock-receipt.dto';
import { ListInventoryQueryDto } from './dto/list-inventory-query.dto';
import { UpdateStockReceiptDto } from './dto/update-stock-receipt.dto';
import { UpdateStockReceiptStatusDto } from './dto/update-stock-receipt-status.dto';
import { StockReceiptsService } from './stock-receipts.service';

@ApiTags('inventory')
@ApiBearerAuth()
@Controller('inventory/stock-receipts')
export class StockReceiptsController {
  constructor(private readonly receipts: StockReceiptsService) {}

  @Get()
  @RequireOrganizationContext()
  @RequirePermissions(InventoryPermissionKeys.VIEW)
  @ApiOperation({ summary: 'List stock receipts' })
  list(@Query() query: ListInventoryQueryDto) {
    return this.receipts.list(query);
  }

  @Get(':id')
  @RequireOrganizationContext()
  @RequirePermissions(InventoryPermissionKeys.VIEW)
  @ApiOperation({ summary: 'Stock receipt detail' })
  getOne(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.receipts.getById(organizationId, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireOrganizationContext()
  @RequireAnyPermissions(...InventoryWriteAny.CREATE)
  @ApiOperation({ summary: 'Create stock receipt' })
  create(@Body() dto: CreateStockReceiptDto) {
    return this.receipts.create(dto);
  }

  @Patch(':id')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...InventoryWriteAny.UPDATE)
  @ApiOperation({ summary: 'Update stock receipt' })
  update(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStockReceiptDto,
  ) {
    return this.receipts.update(organizationId, id, dto);
  }

  @Patch(':id/status')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...InventoryWriteAny.UPDATE)
  @ApiOperation({ summary: 'Activate or deactivate stock receipt' })
  updateStatus(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStockReceiptStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.receipts.updateStatus(organizationId, id, dto, user.userId);
  }
}
