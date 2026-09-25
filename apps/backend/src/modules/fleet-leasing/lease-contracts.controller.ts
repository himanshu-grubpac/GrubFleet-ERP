import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
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
import { CreateLeaseContractDto } from './dto/create-lease-contract.dto';
import { ListLeaseContractsQueryDto } from './dto/list-lease-contracts-query.dto';
import { UpdateLeaseContractDto } from './dto/update-lease-contract.dto';
import { LeaseContractsService } from './lease-contracts.service';
import { RegisterReturnDto } from './dto/register-return.dto';
import { UpdateContractAssetLinesDto } from './dto/update-contract-asset-lines.dto';
import { UpdateContractTermsDto } from './dto/update-contract-terms.dto';

@ApiTags('fleet-leasing')
@ApiBearerAuth()
@Controller('fleet-leasing/lease-contracts')
export class LeaseContractsController {
  constructor(private readonly leaseContracts: LeaseContractsService) {}

  @Get('summary')
  @RequireOrganizationContext()
  @RequirePermissions(FleetLeasingPermissionKeys.VIEW)
  @ApiOperation({ summary: 'KPI counts for lease contracts list header' })
  summary(@Query('organizationId', ParseUUIDPipe) organizationId: string) {
    return this.leaseContracts.getSummary(organizationId);
  }

  @Get()
  @RequireOrganizationContext()
  @RequirePermissions(FleetLeasingPermissionKeys.VIEW)
  @ApiOperation({ summary: 'List lease contracts with search and status filter' })
  list(@Query() query: ListLeaseContractsQueryDto) {
    return this.leaseContracts.list(query);
  }

  @Post()
  @RequireOrganizationContext()
  @RequireAnyPermissions(...FleetLeasingWriteAny.CREATE)
  @ApiOperation({ summary: 'Create draft lease contract (wizard entry)' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateLeaseContractDto,
  ) {
    return this.leaseContracts.create(user.userId, dto);
  }

  @Get(':id/terms/evaluation')
  @RequireOrganizationContext()
  @RequirePermissions(FleetLeasingPermissionKeys.VIEW)
  @ApiOperation({
    summary: 'Wizard step 3 — pricing engine preview (deposit + line rates)',
  })
  getTermsEvaluation(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leaseContracts.getTermsEvaluation(organizationId, id);
  }

  @Put(':id/terms')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...FleetLeasingWriteAny.UPDATE)
  @ApiOperation({ summary: 'Wizard step 3 — contract terms' })
  updateTerms(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContractTermsDto,
  ) {
    return this.leaseContracts.updateContractTerms(
      user.userId,
      organizationId,
      id,
      dto,
    );
  }

  @Put(':id/asset-lines')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...FleetLeasingWriteAny.UPDATE)
  @ApiOperation({
    summary:
      'Wizard step 2 — asset-class lines with availability (confirmShortfall for shortfall modal)',
  })
  updateAssetLines(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContractAssetLinesDto,
  ) {
    return this.leaseContracts.updateAssetLines(
      user.userId,
      organizationId,
      id,
      dto,
    );
  }

  @Get(':id/review')
  @RequireOrganizationContext()
  @RequirePermissions(FleetLeasingPermissionKeys.VIEW)
  @ApiOperation({ summary: 'Wizard step 4 — review contract payload' })
  getReview(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leaseContracts.getReview(organizationId, id);
  }

  @Get(':id')
  @RequireOrganizationContext()
  @RequirePermissions(FleetLeasingPermissionKeys.VIEW)
  @ApiOperation({ summary: 'Lease contract detail with lines, logs, return progress' })
  getOne(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leaseContracts.getById(organizationId, id);
  }

  @Patch(':id')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...FleetLeasingWriteAny.UPDATE)
  @ApiOperation({ summary: 'Update draft/active contract fields and lines' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeaseContractDto,
  ) {
    return this.leaseContracts.update(user.userId, organizationId, id, dto);
  }

  @Post(':id/submit')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...FleetLeasingWriteAny.UPDATE)
  @ApiOperation({
    summary:
      'Wizard step 4 — submit for approval when pricing requires approval (Pending Approval)',
  })
  submit(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leaseContracts.submitForApproval(user.userId, organizationId, id);
  }

  @Post(':id/confirm')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...FleetLeasingWriteAny.UPDATE)
  @ApiOperation({
    summary:
      'Wizard step 4 — confirm contract when within standard limits (activates or awaiting assets)',
  })
  confirm(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leaseContracts.confirmContract(user.userId, organizationId, id);
  }

  @Post(':id/approve')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...FleetLeasingWriteAny.APPROVE)
  approve(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leaseContracts.approveContract(user.userId, organizationId, id);
  }

  @Post(':id/activate')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...FleetLeasingWriteAny.UPDATE)
  activate(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leaseContracts.activate(user.userId, organizationId, id);
  }

  @Post(':id/reactivate')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...FleetLeasingWriteAny.UPDATE)
  reactivate(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leaseContracts.reactivate(user.userId, organizationId, id);
  }

  @Post(':id/deactivate')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...FleetLeasingWriteAny.UPDATE)
  deactivate(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leaseContracts.deactivate(user.userId, organizationId, id);
  }

  @Post(':id/pause-billing')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...FleetLeasingWriteAny.UPDATE)
  pauseBilling(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leaseContracts.pauseBilling(user.userId, organizationId, id);
  }

  @Post(':id/request-termination')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...FleetLeasingWriteAny.UPDATE)
  requestTermination(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leaseContracts.requestTermination(user.userId, organizationId, id);
  }

  @Post(':id/approve-termination')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...FleetLeasingWriteAny.APPROVE)
  approveTermination(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leaseContracts.approveTermination(user.userId, organizationId, id);
  }

  @Post(':id/register-return')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...FleetLeasingWriteAny.UPDATE)
  @ApiOperation({ summary: 'Log vehicle return (registered) for contract' })
  registerReturn(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RegisterReturnDto,
  ) {
    return this.leaseContracts.registerReturn(
      user.userId,
      organizationId,
      id,
      dto,
    );
  }
}
