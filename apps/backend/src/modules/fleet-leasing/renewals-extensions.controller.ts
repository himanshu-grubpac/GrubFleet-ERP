import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequireOrganizationContext } from '../auth/authorization/decorators/require-organization-context.decorator';
import { RequirePermissions } from '../auth/authorization/decorators/require-permissions.decorator';
import { FleetLeasingPermissionKeys } from './constants/fleet-leasing-permission-keys';
import { ListRenewalsExtensionsQueryDto } from './dto/list-renewals-extensions-query.dto';
import { LeaseContractsService } from './lease-contracts.service';

@ApiTags('fleet-leasing')
@ApiBearerAuth()
@Controller('fleet-leasing/renewals-extensions')
export class RenewalsExtensionsController {
  constructor(private readonly leaseContracts: LeaseContractsService) {}

  @Get()
  @RequireOrganizationContext()
  @RequirePermissions(FleetLeasingPermissionKeys.VIEW)
  @ApiOperation({
    summary:
      'List active lease contracts eligible for renewal or extension (LEASE-16)',
  })
  list(@Query() query: ListRenewalsExtensionsQueryDto) {
    return this.leaseContracts.listRenewalEligible(query);
  }
}
