import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
  FleetLeasingPermissionKeys,
  FleetLeasingWriteAny,
} from './constants/fleet-leasing-permission-keys';
import { CreateVehicleAllocationDto } from './dto/create-vehicle-allocation.dto';
import { ListVehicleAllocationsQueryDto } from './dto/list-vehicle-allocations-query.dto';
import { VehicleAllocationsService } from './vehicle-allocations.service';

@ApiTags('fleet-leasing')
@ApiBearerAuth()
@Controller('fleet-leasing')
export class VehicleAllocationsController {
  constructor(private readonly allocations: VehicleAllocationsService) {}

  @Get('vehicle-allocations')
  @RequireOrganizationContext()
  @RequirePermissions(FleetLeasingPermissionKeys.VIEW)
  @ApiOperation({ summary: 'Org-wide vehicle allocation hub (paginated)' })
  listHub(@Query() query: ListVehicleAllocationsQueryDto) {
    return this.allocations.listHub(query);
  }

  @Get('vehicle-allocations/:id')
  @RequireOrganizationContext()
  @RequirePermissions(FleetLeasingPermissionKeys.VIEW)
  @ApiOperation({ summary: 'Vehicle allocation detail' })
  getOne(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.allocations.getById(organizationId, id);
  }

  @Get('lease-contracts/:contractId/vehicle-allocations')
  @RequireOrganizationContext()
  @RequirePermissions(FleetLeasingPermissionKeys.VIEW)
  @ApiOperation({ summary: 'Allocations for a lease contract' })
  listForContract(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('contractId', ParseUUIDPipe) contractId: string,
  ) {
    return this.allocations.listForContract(organizationId, contractId);
  }

  @Post('lease-contracts/:contractId/vehicle-allocations')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...FleetLeasingWriteAny.UPDATE)
  @ApiOperation({ summary: 'Allocate (or reassign) a vehicle to a contract' })
  allocate(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('contractId', ParseUUIDPipe) contractId: string,
    @Body() dto: CreateVehicleAllocationDto,
  ) {
    return this.allocations.allocate(
      user.userId,
      organizationId,
      contractId,
      dto,
    );
  }
}
