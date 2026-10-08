import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequireAnyPermissions } from '../auth/authorization/decorators/require-any-permissions.decorator';
import { RequireOrganizationContext } from '../auth/authorization/decorators/require-organization-context.decorator';
import { RequirePermissions } from '../auth/authorization/decorators/require-permissions.decorator';
import {
  FinancePermissionKeys,
  FinanceWriteAny,
} from './constants/finance-permission-keys';
import { CreateInventoryPartDto } from './dto/create-inventory-part.dto';
import { ListInventoryPartsQueryDto } from './dto/list-inventory-parts-query.dto';
import { InventoryPartsService } from './inventory-parts.service';

@ApiTags('finance')
@ApiBearerAuth()
@Controller('finance/inventory-parts')
export class InventoryPartsController {
  constructor(private readonly parts: InventoryPartsService) {}

  @Get()
  @RequireOrganizationContext()
  @RequirePermissions(FinancePermissionKeys.VIEW)
  @ApiOperation({
    summary: 'Catalog of inventory parts (interim until Inventory module)',
  })
  list(@Query() query: ListInventoryPartsQueryDto) {
    return this.parts.list(query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireOrganizationContext()
  @RequireAnyPermissions(...FinanceWriteAny.CREATE)
  @ApiOperation({ summary: 'Create catalog part (dev / inline catalog)' })
  create(@Body() dto: CreateInventoryPartDto) {
    return this.parts.create(dto);
  }
}
