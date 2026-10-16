import {
  Body,
  Controller,
  Get,
  HttpCode,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  toPaginatedResult,
} from '../../common/dto/pagination-query.dto';
import { RequireOrganizationContext } from '../auth/authorization/decorators/require-organization-context.decorator';
import { RequirePermissions } from '../auth/authorization/decorators/require-permissions.decorator';
import { FleetLeasingPermissionKeys } from './constants/fleet-leasing-permission-keys';
import { AssetRegisterCatalogService } from '../asset-register/asset-register-catalog.service';
import { ListFleetAssetClassesQueryDto } from './dto/list-fleet-asset-classes-query.dto';
import { PreviewAssetAvailabilityBatchDto } from './dto/preview-asset-availability.dto';
import { computeAssetLineAvailability } from './utils/asset-class-availability.util';

@ApiTags('fleet-leasing')
@ApiBearerAuth()
@Controller('fleet-leasing/asset-classes')
export class AssetClassesController {
  constructor(
    private readonly assetRegisterCatalog: AssetRegisterCatalogService,
  ) {}

  @Get()
  @RequireOrganizationContext()
  @RequirePermissions(FleetLeasingPermissionKeys.VIEW)
  @ApiOperation({
    summary:
      'Distinct active asset class names from asset register (wizard dropdown)',
  })
  async list(@Query() query: ListFleetAssetClassesQueryDto) {
    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const { rows, total } =
      await this.assetRegisterCatalog.listDistinctActiveAssetClassNames(
        query.organizationId,
        page,
        pageSize,
      );
    return toPaginatedResult(rows, page, pageSize, total);
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
    const { availableNow, inbound } =
      await this.assetRegisterCatalog.getAssetClassInventory(
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
    const classNames = dto.lines.map((line) => line.assetClass);
    const inventoryByClass =
      await this.assetRegisterCatalog.getAssetClassInventoryBatch(
        dto.organizationId,
        classNames,
      );
    const lines = dto.lines.map((line) => {
      const availableNow = inventoryByClass.get(line.assetClass.trim()) ?? 0;
      const inbound = 0;
      return computeAssetLineAvailability(
        line.assetClass,
        line.committedQuantity,
        availableNow,
        inbound,
        false,
      );
    });
    const mvpAllLinesCovered = lines.every((l) => l.mvpAvailableNowCovers);
    return { lines, mvpAllLinesCovered };
  }
}
