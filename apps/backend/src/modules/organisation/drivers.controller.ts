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
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { RequireAnyPermissions } from '../auth/authorization/decorators/require-any-permissions.decorator';
import { RequireOrganizationContext } from '../auth/authorization/decorators/require-organization-context.decorator';
import { RequirePermissions } from '../auth/authorization/decorators/require-permissions.decorator';
import {
  OrganisationPermissionKeys,
  OrganisationWriteAny,
} from './constants/organisation-permission-keys';
import { AssignDriverVehicleDto } from './dto/assign-driver-vehicle.dto';
import { CreateDriverDto } from './dto/create-driver.dto';
import { ListAssignableVehiclesQueryDto } from './dto/list-assignable-vehicles-query.dto';
import { ListDriversQueryDto } from './dto/list-drivers-query.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { UpdateDriverStatusDto } from './dto/update-driver-status.dto';
import { DriversService } from './drivers.service';

@ApiTags('organisation')
@ApiBearerAuth()
@Controller('organisation/drivers')
export class DriversController {
  constructor(private readonly drivers: DriversService) {}

  @Get()
  @RequireOrganizationContext()
  @RequirePermissions(OrganisationPermissionKeys.VIEW)
  @ApiOperation({
    summary: 'List organisation drivers (paginated)',
    description:
      'Default sort: createdAt descending (newest first), then id descending.',
  })
  list(@Query() query: ListDriversQueryDto) {
    return this.drivers.list(query);
  }

  @Get('assignable-vehicles')
  @RequireOrganizationContext()
  @RequirePermissions(OrganisationPermissionKeys.VIEW)
  @ApiOperation({
    summary: 'List vehicles available for driver assignment (paginated)',
    description:
      'Vehicles on active lease contracts (allocations or contract links) with no driver assigned (excludes codes already linked on organisation drivers).',
  })
  listAssignableVehicles(@Query() query: ListAssignableVehiclesQueryDto) {
    return this.drivers.listAssignableVehicles(query);
  }

  @Get(':id')
  @RequireOrganizationContext()
  @RequirePermissions(OrganisationPermissionKeys.VIEW)
  @ApiOperation({ summary: 'Driver register detail' })
  getOne(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.drivers.getById(organizationId, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireOrganizationContext()
  @RequireAnyPermissions(...OrganisationWriteAny.CREATE)
  @ApiOperation({ summary: 'Create organisation driver (starts inactive)' })
  create(@Body() dto: CreateDriverDto) {
    return this.drivers.create(dto);
  }

  @Patch(':id')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...OrganisationWriteAny.UPDATE)
  @ApiOperation({ summary: 'Update organisation driver' })
  update(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDriverDto,
  ) {
    return this.drivers.update(organizationId, id, dto);
  }

  @Patch(':id/status')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...OrganisationWriteAny.UPDATE)
  @ApiOperation({
    summary: 'Activate or deactivate driver (reason required for deactivate)',
  })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDriverStatusDto,
  ) {
    return this.drivers.updateStatus(user.userId, organizationId, id, dto);
  }

  @Post(':id/assign')
  @HttpCode(HttpStatus.OK)
  @RequireOrganizationContext()
  @RequireAnyPermissions(...OrganisationWriteAny.UPDATE)
  @ApiOperation({
    summary: 'Assign driver to a lease vehicle (marks driver active)',
  })
  assignVehicle(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignDriverVehicleDto,
  ) {
    return this.drivers.assignVehicle(organizationId, id, dto);
  }

  @Post(':id/unassign')
  @HttpCode(HttpStatus.OK)
  @RequireOrganizationContext()
  @RequireAnyPermissions(...OrganisationWriteAny.UPDATE)
  @ApiOperation({
    summary:
      'Remove driver vehicle assignment (may mark inactive when tied to contract)',
  })
  unassignVehicle(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.drivers.unassignVehicle(user.userId, organizationId, id);
  }
}
