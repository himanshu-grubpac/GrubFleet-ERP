import {
  Body,
  Controller,
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
import { AssetRegisterWriteAny } from './constants/asset-register-permission-keys';
import { BulkAssignAssetRegisterVehiclesDto } from './dto/bulk-assign-asset-register-vehicles.dto';

@ApiTags('asset-register')
@ApiBearerAuth()
@Controller('asset-register/vehicle-assignments')
export class AssetRegisterAssignmentsController {
  constructor(private readonly assignments: AssetRegisterAssignmentsService) {}

  @Post('bulk-assign')
  @HttpCode(HttpStatus.OK)
  @RequireOrganizationContext()
  @RequireAnyPermissions(...AssetRegisterWriteAny.UPDATE)
  @ApiOperation({
    summary: 'Bulk assign fleet register vehicles to an active lease contract',
    description:
      'Requires active lifecycle vehicles with operationalStatus available. Updates operationalStatus to leased and records assignment rows. Lease capacity is validated per contract asset line (matched by asset class name).',
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
