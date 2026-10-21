import {
  BadRequestException,
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
import { resolveListSort } from '../../common/utils/list-sort.util';
import {
  FLEET_ASSET_CLASS_LIST_DEFAULT_SORT,
  FLEET_ASSET_CLASS_LIST_SORT_FIELDS,
} from './constants/fleet-leasing-list-sort.constants';
import type { AssetClassListSortField } from '../asset-register/constants/asset-register-list-sort.constants';
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
      'Active asset register classes (wizard dropdown — id, name, specLabel)',
  })
  async list(@Query() query: ListFleetAssetClassesQueryDto) {
    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const sort = resolveListSort(
      FLEET_ASSET_CLASS_LIST_SORT_FIELDS,
      { sortBy: query.sortBy, sortOrder: query.sortOrder },
      FLEET_ASSET_CLASS_LIST_DEFAULT_SORT,
    );
    const classSortBy: AssetClassListSortField =
      sort.sortBy === 'registrationNo' ? 'createdAt' : 'name';
    const { catalog, total } =
      await this.assetRegisterCatalog.listActiveAssetClassCatalog(
        query.organizationId,
        page,
        pageSize,
        { sortBy: classSortBy, sortOrder: sort.sortOrder },
      );
    const names = catalog.map((row) => row.name);
    return {
      ...toPaginatedResult(names, page, pageSize, total),
      catalog,
    };
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
    @Query('assetClass') assetClass: string | undefined,
    @Query('assetClassId') assetClassId: string | undefined,
    @Query('committedQuantity') committedQuantityRaw: string,
  ) {
    const committedQuantity = Number(committedQuantityRaw);
    let className: string;
    if (assetClassId?.trim()) {
      const inv =
        await this.assetRegisterCatalog.getAssetClassInventoryByClassId(
          organizationId,
          assetClassId.trim(),
        );
      className = inv.name;
      return computeAssetLineAvailability(
        className,
        committedQuantity,
        inv.availableNow,
        inv.inbound,
        false,
      );
    }
    if (!assetClass?.trim()) {
      throw new BadRequestException('assetClass or assetClassId is required');
    }
    className = assetClass.trim();
    const { availableNow, inbound } =
      await this.assetRegisterCatalog.getAssetClassInventory(
        organizationId,
        className,
      );
    return computeAssetLineAvailability(
      className,
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
    const resolvedLines = await Promise.all(
      dto.lines.map((line) =>
        this.assetRegisterCatalog.resolveAssetClassForAvailabilityPreview(
          dto.organizationId,
          {
            assetClass: line.assetClass,
            assetClassId: line.assetClassId,
          },
        ),
      ),
    );
    const classIds = resolvedLines
      .map((row) => row.id)
      .filter((id): id is string => Boolean(id));
    const inventoryById =
      classIds.length > 0
        ? await this.assetRegisterCatalog.getAssetClassInventoryBatchByIds(
            dto.organizationId,
            classIds,
          )
        : new Map<string, number>();
    const lines = dto.lines.map((line, index) => {
      const resolved = resolvedLines[index];
      const availableNow = resolved.id
        ? (inventoryById.get(resolved.id) ?? 0)
        : 0;
      const inbound = 0;
      return computeAssetLineAvailability(
        resolved.name,
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
