import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseUUIDPipe } from '@nestjs/common';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  PaginationQueryDto,
  toPaginatedResult,
} from '../../common/dto/pagination-query.dto';
import { RequireAnyPermissions } from '../auth/authorization/decorators/require-any-permissions.decorator';
import { RequireOrganizationContext } from '../auth/authorization/decorators/require-organization-context.decorator';
import { RequirePermissions } from '../auth/authorization/decorators/require-permissions.decorator';
import {
  FleetLeasingPermissionKeys,
  FleetLeasingWriteAny,
} from './constants/fleet-leasing-permission-keys';
import { CreateFleetVehicleDto } from './dto/create-fleet-vehicle.dto';
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
  async list(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() pagination: PaginationQueryDto,
    @Query('status') status?: string,
    @Query('assetClass') assetClass?: string,
  ) {
    const page = pagination.page ?? DEFAULT_PAGE;
    const pageSize = pagination.pageSize ?? DEFAULT_PAGE_SIZE;
    const { rows, total } = await this.repo.listVehicles(
      organizationId,
      page,
      pageSize,
      status,
      assetClass,
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
