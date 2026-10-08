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
import { CreateSparePartDto } from './dto/create-spare-part.dto';
import { ListInventoryQueryDto } from './dto/list-inventory-query.dto';
import { UpdateSparePartDto } from './dto/update-spare-part.dto';
import { UpdateSparePartStatusDto } from './dto/update-spare-part-status.dto';
import { StockRegisterService } from './stock-register.service';

@ApiTags('inventory')
@ApiBearerAuth()
@Controller('inventory/stock-register')
export class StockRegisterController {
  constructor(private readonly stockRegister: StockRegisterService) {}

  @Get()
  @RequireOrganizationContext()
  @RequirePermissions(InventoryPermissionKeys.VIEW)
  @ApiOperation({ summary: 'List spare parts (stock register)' })
  list(@Query() query: ListInventoryQueryDto) {
    return this.stockRegister.list(query);
  }

  @Get(':id')
  @RequireOrganizationContext()
  @RequirePermissions(InventoryPermissionKeys.VIEW)
  @ApiOperation({ summary: 'Spare part detail' })
  getOne(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.stockRegister.getById(organizationId, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireOrganizationContext()
  @RequireAnyPermissions(...InventoryWriteAny.CREATE)
  @ApiOperation({ summary: 'Create spare part' })
  create(@Body() dto: CreateSparePartDto) {
    return this.stockRegister.create(dto);
  }

  @Patch(':id')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...InventoryWriteAny.UPDATE)
  @ApiOperation({ summary: 'Update spare part' })
  update(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSparePartDto,
  ) {
    return this.stockRegister.update(organizationId, id, dto);
  }

  @Patch(':id/status')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...InventoryWriteAny.UPDATE)
  @ApiOperation({ summary: 'Activate or deactivate spare part' })
  updateStatus(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSparePartStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.stockRegister.updateStatus(
      organizationId,
      id,
      dto,
      user.userId,
    );
  }
}
