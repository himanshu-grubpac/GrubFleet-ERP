import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseUUIDPipe } from '@nestjs/common';
import { RequireOrganizationContext } from '../auth/authorization/decorators/require-organization-context.decorator';
import { RequirePermissions } from '../auth/authorization/decorators/require-permissions.decorator';
import { FleetLeasingPermissionKeys } from './constants/fleet-leasing-permission-keys';
import { FleetLeasingRepository } from './repositories/fleet-leasing.repository';
import { PreviewAssetAvailabilityBatchDto } from './dto/preview-asset-availability.dto';
import { computeAssetLineAvailability } from './utils/asset-class-availability.util';

@ApiTags('fleet-leasing')
@ApiBearerAuth()
@Controller('fleet-leasing/asset-classes')
export class AssetClassesController {
  constructor(private readonly repo: FleetLeasingRepository) {}

  @Get()
  @RequireOrganizationContext()
  @RequirePermissions(FleetLeasingPermissionKeys.VIEW)
  @ApiOperation({
    summary:
      'Distinct asset classes from fleet vehicle master (wizard dropdown)',
  })
  async list(@Query('organizationId', ParseUUIDPipe) organizationId: string) {
    const items = await this.repo.listDistinctAssetClasses(organizationId);
    return { items };
  }

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

  @Post('availability/preview')
  @HttpCode(200)
  @RequireOrganizationContext()
  @RequirePermissions(FleetLeasingPermissionKeys.VIEW)
  @ApiOperation({
    summary: 'Batch availability preview for wizard step 2 (LEASE-03 table)',
  })
  async previewBatch(@Body() dto: PreviewAssetAvailabilityBatchDto) {
    const lines = await Promise.all(
      dto.lines.map(async (line) => {
        const { availableNow, inbound } =
          await this.repo.getAssetClassInventory(
            dto.organizationId,
            line.assetClass,
          );
        return computeAssetLineAvailability(
          line.assetClass,
          line.committedQuantity,
          availableNow,
          inbound,
          false,
        );
      }),
    );
    const mvpAllLinesCovered = lines.every((l) => l.mvpAvailableNowCovers);
    return { lines, mvpAllLinesCovered };
  }
}
