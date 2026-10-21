import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireAnyPermissions } from '../auth/authorization/decorators/require-any-permissions.decorator';
import { RequireOrganizationContext } from '../auth/authorization/decorators/require-organization-context.decorator';
import { RequirePermissions } from '../auth/authorization/decorators/require-permissions.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import {
  FleetLeasingPermissionKeys,
  FleetLeasingWriteAny,
} from './constants/fleet-leasing-permission-keys';
import { CreateVehicleReplacementsDto } from './dto/create-vehicle-replacements.dto';
import { ListReplacementCandidatesQueryDto } from './dto/list-replacement-candidates-query.dto';
import { LookupOnLeaseVehicleQueryDto } from './dto/lookup-on-lease-vehicle-query.dto';
import { ReplacementFilterOptionsQueryDto } from './dto/replacement-filter-options-query.dto';
import { ListSupportPaginatedQueryDto } from './dto/list-support-paginated-query.dto';
import { SupportVehicleReplacementService } from './support-vehicle-replacement.service';

@ApiTags('fleet-leasing')
@ApiBearerAuth()
@Controller('fleet-leasing/support')
export class FleetSupportController {
  constructor(
    private readonly supportReplacement: SupportVehicleReplacementService,
  ) {}

  @Get('on-lease-vehicle-lookup')
  @RequireOrganizationContext()
  @RequirePermissions(FleetLeasingPermissionKeys.VIEW)
  @ApiOperation({
    summary:
      'Resolve registration or VIN to on-lease vehicle with contract and client context',
  })
  lookupOnLeaseVehicle(@Query() query: LookupOnLeaseVehicleQueryDto) {
    return this.supportReplacement.lookupOnLeaseVehicle(query);
  }

  @Get('replacement-candidates')
  @RequireOrganizationContext()
  @RequirePermissions(FleetLeasingPermissionKeys.VIEW)
  @ApiOperation({
    summary: 'Paginated available vehicles eligible as replacements',
  })
  listReplacementCandidates(@Query() query: ListReplacementCandidatesQueryDto) {
    return this.supportReplacement.listReplacementCandidates(query);
  }

  @Get('available-replacement-lookup')
  @RequireOrganizationContext()
  @RequirePermissions(FleetLeasingPermissionKeys.VIEW)
  @ApiOperation({
    summary:
      'Resolve registration, VIN, or fleet code to an available replacement vehicle',
  })
  lookupAvailableReplacement(@Query() query: LookupOnLeaseVehicleQueryDto) {
    return this.supportReplacement.lookupAvailableReplacement(query);
  }

  @Get('replacement-filter-options')
  @RequireOrganizationContext()
  @RequirePermissions(FleetLeasingPermissionKeys.VIEW)
  @ApiOperation({
    summary:
      'Distinct brands (by wheeler) or models (by wheeler + brand) for replacement filter',
  })
  listReplacementFilterOptions(
    @Query() query: ReplacementFilterOptionsQueryDto,
  ) {
    return this.supportReplacement.listReplacementFilterOptions(query);
  }

  @Get('clients/:clientId/active-contracts')
  @RequireOrganizationContext()
  @RequirePermissions(FleetLeasingPermissionKeys.VIEW)
  @ApiOperation({
    summary: 'Active/on-lease contracts for a fleet client (Other path)',
  })
  listActiveContractsForClient(
    @Query() query: ListSupportPaginatedQueryDto,
    @Param('clientId', ParseUUIDPipe) clientId: string,
  ) {
    return this.supportReplacement.listActiveContractsForClient(
      query.organizationId,
      clientId,
      query.page,
      query.pageSize,
    );
  }

  @Get('lease-contracts/:contractId/allocated-vehicles')
  @RequireOrganizationContext()
  @RequirePermissions(FleetLeasingPermissionKeys.VIEW)
  @ApiOperation({ summary: 'Vehicles currently allocated to a contract' })
  listAllocatedVehicles(
    @Query() query: ListSupportPaginatedQueryDto,
    @Param('contractId', ParseUUIDPipe) contractId: string,
  ) {
    return this.supportReplacement.listAllocatedVehicles(
      query.organizationId,
      contractId,
      query.page,
      query.pageSize,
    );
  }

  @Post('vehicle-replacements')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...FleetLeasingWriteAny.UPDATE)
  @ApiOperation({
    summary: 'Execute one or more pairwise vehicle replacements on contracts',
  })
  executeReplacements(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateVehicleReplacementsDto,
  ) {
    return this.supportReplacement.executeReplacements(user.userId, dto);
  }
}
