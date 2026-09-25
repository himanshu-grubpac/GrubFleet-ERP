import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequireOrganizationContext } from '../auth/authorization/decorators/require-organization-context.decorator';
import { RequirePermissions } from '../auth/authorization/decorators/require-permissions.decorator';
import { FleetLeasingPermissionKeys } from './constants/fleet-leasing-permission-keys';
import { ListFleetReturnsQueryDto } from './dto/list-fleet-returns-query.dto';
import { FleetReturnsService } from './fleet-returns.service';

@ApiTags('fleet-leasing')
@ApiBearerAuth()
@Controller('fleet-leasing/returns')
export class FleetReturnsController {
  constructor(private readonly returns: FleetReturnsService) {}

  @Get()
  @RequireOrganizationContext()
  @RequirePermissions(FleetLeasingPermissionKeys.VIEW)
  @ApiOperation({ summary: 'Returns & inspections hub (paginated)' })
  list(@Query() query: ListFleetReturnsQueryDto) {
    return this.returns.list(query);
  }

  @Get(':id')
  @RequireOrganizationContext()
  @RequirePermissions(FleetLeasingPermissionKeys.VIEW)
  @ApiOperation({ summary: 'Return inspection detail' })
  getOne(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.returns.getById(organizationId, id);
  }
}
