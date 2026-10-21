import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  toPaginatedResult,
} from '../../common/dto/pagination-query.dto';
import { resolveListSort } from '../../common/utils/list-sort.util';
import { RequireAnyPermissions } from '../auth/authorization/decorators/require-any-permissions.decorator';
import { RequireOrganizationContext } from '../auth/authorization/decorators/require-organization-context.decorator';
import { RequirePermissions } from '../auth/authorization/decorators/require-permissions.decorator';
import {
  FLEET_VEHICLE_LIST_DEFAULT_SORT,
  FLEET_VEHICLE_LIST_SORT_FIELDS,
} from './constants/fleet-leasing-list-sort.constants';
import {
  FleetLeasingPermissionKeys,
  FleetLeasingWriteAny,
} from './constants/fleet-leasing-permission-keys';
import { CreateFleetVehicleDto } from './dto/create-fleet-vehicle.dto';
import { ListFleetVehiclesQueryDto } from './dto/list-fleet-vehicles-query.dto';
import { FleetLeasingRepository } from './repositories/fleet-leasing.repository';

@ApiTags('fleet-leasing')
@ApiBearerAuth()
@Controller('fleet-leasing/vehicles')
export class FleetVehiclesController {
  constructor(private readonly repo: FleetLeasingRepository) {}

  @Get()
  @RequireOrganizationContext()
  @RequirePermissions(FleetLeasingPermissionKeys.VIEW)
  @ApiOperation({ summary: 'Vehicle master list (Asset Register subset)' })
  async list(@Query() query: ListFleetVehiclesQueryDto) {
    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const sort = resolveListSort(
      FLEET_VEHICLE_LIST_SORT_FIELDS,
      { sortBy: query.sortBy, sortOrder: query.sortOrder },
      FLEET_VEHICLE_LIST_DEFAULT_SORT,
    );
    const { rows, total } = await this.repo.listVehicles(
      query.organizationId,
      page,
      pageSize,
      query.status,
      query.assetClass,
      sort,
    );
    return toPaginatedResult(rows, page, pageSize, total);
  }

  @Post()
  @RequireOrganizationContext()
  @RequireAnyPermissions(...FleetLeasingWriteAny.CREATE)
  async create(@Body() dto: CreateFleetVehicleDto) {
    return this.repo.insertVehicle({
      organizationId: dto.organizationId,
      vin: dto.vin,
      registrationNo: dto.registrationNo,
      registrationExpiry: new Date(dto.registrationExpiry),
      insuranceExpiry: new Date(dto.insuranceExpiry),
      odometer: dto.odometer ?? 0,
      assetClass: dto.assetClass,
      location: dto.location ?? null,
      status: 'available',
    });
  }
}
