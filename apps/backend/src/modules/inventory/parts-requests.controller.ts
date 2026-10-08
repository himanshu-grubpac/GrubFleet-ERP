import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequireOrganizationContext } from '../auth/authorization/decorators/require-organization-context.decorator';
import { RequirePermissions } from '../auth/authorization/decorators/require-permissions.decorator';
import { InventoryPermissionKeys } from './constants/inventory-permission-keys';
import { ListPartsRequestsQueryDto } from './dto/list-parts-requests-query.dto';
import { PartsRequestsService } from './parts-requests.service';

@ApiTags('inventory')
@ApiBearerAuth()
@Controller('inventory/parts-requests')
export class PartsRequestsController {
  constructor(private readonly partsRequests: PartsRequestsService) {}

  @Get()
  @RequireOrganizationContext()
  @RequirePermissions(InventoryPermissionKeys.VIEW)
  @ApiOperation({ summary: 'List parts requests' })
  list(@Query() query: ListPartsRequestsQueryDto) {
    return this.partsRequests.list(query);
  }

  @Get(':id')
  @RequireOrganizationContext()
  @RequirePermissions(InventoryPermissionKeys.VIEW)
  @ApiOperation({ summary: 'Parts request detail' })
  getOne(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.partsRequests.getById(organizationId, id);
  }
}
