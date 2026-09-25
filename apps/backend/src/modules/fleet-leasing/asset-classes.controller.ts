import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseUUIDPipe } from '@nestjs/common';
import { RequireOrganizationContext } from '../auth/authorization/decorators/require-organization-context.decorator';
import { RequirePermissions } from '../auth/authorization/decorators/require-permissions.decorator';
import { FleetLeasingPermissionKeys } from './constants/fleet-leasing-permission-keys';
import { FleetLeasingRepository } from './repositories/fleet-leasing.repository';
import { computeAssetLineAvailability } from './utils/asset-class-availability.util';

@ApiTags('fleet-leasing')
@ApiBearerAuth()
@Controller('fleet-leasing/asset-classes')
export class AssetClassesController {
  constructor(private readonly repo: FleetLeasingRepository) {}

  @Get('availability')
  @RequireOrganizationContext()
  @RequirePermissions(FleetLeasingPermissionKeys.VIEW)
  @ApiOperation({
    summary:
      'Preview availability for wizard step 2 (asset class + committed qty)',
  })
  async preview(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Query('assetClass') assetClass: string,
    @Query('committedQuantity') committedQuantityRaw: string,
  ) {
    const committedQuantity = Number(committedQuantityRaw);
    const { availableNow, inbound } = await this.repo.getAssetClassInventory(
      organizationId,
      assetClass,
    );
    return computeAssetLineAvailability(
      assetClass,
      committedQuantity,
      availableNow,
      inbound,
      false,
    );
  }
}
