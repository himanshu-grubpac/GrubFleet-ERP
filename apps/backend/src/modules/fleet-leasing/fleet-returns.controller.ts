import {
  Body,
  Controller,
  Get,
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
import {
  FleetLeasingWriteAny,
  FleetReturnsReadAny,
} from './constants/fleet-leasing-permission-keys';
import { ListFleetReturnsQueryDto } from './dto/list-fleet-returns-query.dto';
import { GetFleetReturnDetailQueryDto } from './dto/get-fleet-return-detail-query.dto';
import { ReceiveReturnDto } from './dto/receive-return.dto';
import { SaveReturnInspectionDto } from './dto/save-return-inspection.dto';
import { FinalizeReturnInspectionDto } from './dto/finalize-return-inspection.dto';
import { SaveReInspectionDto } from './dto/save-re-inspection.dto';
import { ResolveReturnHoldDto } from './dto/resolve-return-hold.dto';
import { FleetReturnsService } from './fleet-returns.service';

@ApiTags('fleet-leasing')
@ApiBearerAuth()
@Controller('fleet-leasing/returns')
export class FleetReturnsController {
  constructor(private readonly returns: FleetReturnsService) {}

  @Get()
  @RequireOrganizationContext()
  @RequireAnyPermissions(...FleetReturnsReadAny)
  @ApiOperation({ summary: 'Returns & inspections hub (paginated)' })
  list(@Query() query: ListFleetReturnsQueryDto) {
    return this.returns.list(query);
  }

  @Get(':id')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...FleetReturnsReadAny)
  @ApiOperation({
    summary:
      'Return inspection detail (includes inspectionResult when completed — Screen 5)',
  })
  getOne(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetFleetReturnDetailQueryDto,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.returns.getById(user.userId, query.organizationId, id, {
      previewOdometer: query.previewOdometer,
      previewConditionAtGlance: query.previewConditionAtGlance,
    });
  }

  @Post(':id/receive')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...FleetLeasingWriteAny.UPDATE)
  @ApiOperation({
    summary: 'Gate-in — receive returned vehicle (Screen 3)',
  })
  receive(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReceiveReturnDto,
  ) {
    return this.returns.receiveReturn(user.userId, organizationId, id, dto);
  }

  @Patch(':id/inspection')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...FleetLeasingWriteAny.UPDATE)
  @ApiOperation({
    summary:
      'Save inspection worksheet or mark checklist ready to finalize (Screen 4)',
  })
  saveInspection(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveReturnInspectionDto,
  ) {
    return this.returns.saveInspectionWorksheet(
      user.userId,
      organizationId,
      id,
      dto,
    );
  }

  @Patch(':id/inspection/finalize')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...FleetLeasingWriteAny.UPDATE)
  @ApiOperation({
    summary:
      'Save inspection finalize draft (Screen 4b — review, charges, disposition)',
  })
  saveInspectionFinalizeDraft(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FinalizeReturnInspectionDto,
  ) {
    return this.returns.finalizeReturnInspection(
      user.userId,
      organizationId,
      id,
      dto,
    );
  }

  @Post(':id/inspection/finalize')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...FleetLeasingWriteAny.UPDATE)
  @ApiOperation({
    summary: 'Complete inspection after finalize review (Screen 4b → 5)',
  })
  completeInspectionFinalize(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FinalizeReturnInspectionDto,
  ) {
    return this.returns.finalizeReturnInspection(
      user.userId,
      organizationId,
      id,
      { ...dto, complete: true },
    );
  }

  @Post(':id/resolve-hold')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...FleetLeasingWriteAny.UPDATE)
  @ApiOperation({
    summary:
      'Clear return hold — reopens finalize review (on_hold disposition only)',
  })
  resolveHold(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveReturnHoldDto,
  ) {
    return this.returns.resolveReturnHold(user.userId, organizationId, id, dto);
  }

  @Post(':id/close-workshop-repair')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...FleetLeasingWriteAny.UPDATE)
  @ApiOperation({
    summary:
      'Mark workshop repair complete — enables re-inspection (LEASE-09c gate)',
  })
  closeWorkshopRepair(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.returns.closeWorkshopRepair(user.userId, organizationId, id);
  }

  @Post(':id/re-inspection/start')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...FleetLeasingWriteAny.UPDATE)
  @ApiOperation({ summary: 'Start post-workshop re-inspection (Screen 6)' })
  startReInspection(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.returns.startReInspection(user.userId, organizationId, id);
  }

  @Patch(':id/re-inspection')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...FleetLeasingWriteAny.UPDATE)
  @ApiOperation({ summary: 'Save or complete re-inspection (Screen 6)' })
  saveReInspection(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveReInspectionDto,
  ) {
    return this.returns.saveReInspection(user.userId, organizationId, id, dto);
  }
}
