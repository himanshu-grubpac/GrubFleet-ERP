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
import { AssetRegisterVehiclesService } from './asset-register-vehicles.service';
import {
  AssetRegisterPermissionKeys,
  AssetRegisterWriteAny,
} from './constants/asset-register-permission-keys';
import { CreateAssetRegisterVehicleDto } from './dto/create-asset-register-vehicle.dto';
import { ListAssetRegisterVehiclesQueryDto } from './dto/list-asset-register-vehicles-query.dto';
import { UpdateAssetRegisterVehicleDto } from './dto/update-asset-register-vehicle.dto';
import { UpdateAssetRegisterVehicleStatusDto } from './dto/update-asset-register-vehicle-status.dto';

@ApiTags('asset-register')
@ApiBearerAuth()
@Controller('asset-register/vehicles')
export class AssetRegisterVehiclesController {
  constructor(private readonly vehicles: AssetRegisterVehiclesService) {}

  @Get()
  @RequireOrganizationContext()
  @RequirePermissions(AssetRegisterPermissionKeys.VIEW)
  @ApiOperation({
    summary: 'List fleet register vehicles (paginated)',
    description:
      'Columns: fleetCode, registrationNumber, asset class name, odometer, operationalStatus. Filter by assetClassId, operationalStatus, lifecycle status, or search fleet code / registration number.',
  })
  list(@Query() query: ListAssetRegisterVehiclesQueryDto) {
    return this.vehicles.list(query);
  }

  @Get(':id/lease-history')
  @RequireOrganizationContext()
  @RequirePermissions(AssetRegisterPermissionKeys.VIEW)
  @ApiOperation({
    summary: 'Lease assignment history for a fleet register vehicle',
    description:
      'Rows from asset_register_vehicle_assignments joined to lease contract summary (lessee, dates, status).',
  })
  getLeaseHistory(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.vehicles.getLeaseHistory(organizationId, id);
  }

  @Get(':id')
  @RequireOrganizationContext()
  @RequirePermissions(AssetRegisterPermissionKeys.VIEW)
  @ApiOperation({
    summary: 'Fleet register vehicle detail',
    description: 'Includes asset class and asset master names.',
  })
  getOne(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.vehicles.getById(organizationId, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireOrganizationContext()
  @RequireAnyPermissions(...AssetRegisterWriteAny.CREATE)
  @ApiOperation({
    summary: 'Register a vehicle',
    description:
      'fleetCode is server-generated (VH-1001 sequence per org). operationalStatus defaults to available; client cannot set operationalStatus in v1.',
  })
  create(@Body() dto: CreateAssetRegisterVehicleDto) {
    return this.vehicles.create(dto);
  }

  @Patch(':id')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...AssetRegisterWriteAny.UPDATE)
  @ApiOperation({
    summary: 'Update fleet register vehicle fields',
    description:
      'Blocked when vehicle is inactive. Class and master must be active and master must belong to class.',
  })
  update(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssetRegisterVehicleDto,
  ) {
    return this.vehicles.update(organizationId, id, dto);
  }

  @Patch(':id/status')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...AssetRegisterWriteAny.UPDATE)
  @ApiOperation({
    summary:
      'Activate or deactivate fleet register vehicle (deactivate requires reason)',
  })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssetRegisterVehicleStatusDto,
  ) {
    return this.vehicles.updateStatus(user.userId, organizationId, id, dto);
  }
}
