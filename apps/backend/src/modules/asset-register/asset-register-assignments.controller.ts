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
import { AssetRegisterAssignmentsService } from './asset-register-assignments.service';
import {
  AssetRegisterPermissionKeys,
  AssetRegisterWriteAny,
} from './constants/asset-register-permission-keys';
import { BulkAssignAssetRegisterVehiclesDto } from './dto/bulk-assign-asset-register-vehicles.dto';
import { ListAssignableLeaseContractsForVehicleQueryDto } from './dto/list-assignable-lease-contracts-for-vehicle-query.dto';
import { BulkAssignCatalogQueryDto } from './dto/bulk-assign-catalog-query.dto';
import { BulkAssignValidateDto } from './dto/bulk-assign-validate.dto';
import { RequirePermissions } from '../auth/authorization/decorators/require-permissions.decorator';

@ApiTags('asset-register')
@ApiBearerAuth()
@Controller('asset-register/vehicle-assignments')
export class AssetRegisterAssignmentsController {
  constructor(private readonly assignments: AssetRegisterAssignmentsService) {}

  @Get('assignable-lease-contracts')
  @RequireOrganizationContext()
  @RequirePermissions(AssetRegisterPermissionKeys.VIEW)
  @ApiOperation({
    summary:
      'List lease contracts with asset lines for a vehicle class (assignable and fully allocated)',
  })
  listAssignableLeaseContracts(
    @Query() query: ListAssignableLeaseContractsForVehicleQueryDto,
  ) {
    return this.assignments.listAssignableLeaseContractsForVehicle(query);
  }

  @Get('bulk-assign/catalog')
  @RequireOrganizationContext()
  @RequirePermissions(AssetRegisterPermissionKeys.VIEW)
  @ApiOperation({
    summary:
      'Bulk assign wizard catalog — clients with open lines; contracts and lines when organisationClientId is set',
  })
  getBulkAssignCatalog(@Query() query: BulkAssignCatalogQueryDto) {
    return this.assignments.getBulkAssignCatalog(query);
  }

  @Post('bulk-assign/validate')
  @HttpCode(HttpStatus.OK)
  @RequireOrganizationContext()
  @RequirePermissions(AssetRegisterPermissionKeys.VIEW)
  @ApiOperation({
    summary:
      'Pre-submit validation for bulk assign — per-vehicle availability and replacement pool count',
  })
  validateBulkAssign(@Body() dto: BulkAssignValidateDto) {
    return this.assignments.validateBulkAssign(dto);
  }

  @Post('bulk-assign')
  @HttpCode(HttpStatus.OK)
  @RequireOrganizationContext()
  @RequireAnyPermissions(...AssetRegisterWriteAny.UPDATE)
  @ApiOperation({
    summary: 'Bulk assign fleet register vehicles to an active lease contract',
    description:
      'Requires active lifecycle vehicles with operationalStatus available. Updates operationalStatus to leased and records assignment rows. Lease capacity is validated per contract asset line (matched by asset class name). Returns 409 with per-vehicle conflicts when selection is stale — no partial assign.',
  })
  bulkAssign(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BulkAssignAssetRegisterVehiclesDto,
  ) {
    return this.assignments.bulkAssign(user.userId, dto);
  }

  @Patch(':vehicleId/unassign')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...AssetRegisterWriteAny.UPDATE)
  @ApiOperation({
    summary: 'Unassign a vehicle from its active lease assignment',
  })
  unassign(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
  ) {
    return this.assignments.unassign(user.userId, organizationId, vehicleId);
  }
}
