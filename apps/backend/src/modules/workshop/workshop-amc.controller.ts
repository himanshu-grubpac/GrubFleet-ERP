import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
import { RequirePermissions } from '../auth/authorization/decorators/require-permissions.decorator';
import {
  WorkshopPermissionKeys,
  WorkshopWriteAny,
} from './constants/workshop-permission-keys';
import { CreateAmcSubscriberDto } from './dto/create-amc-subscriber.dto';
import { CreateAmcTierDto } from './dto/create-amc-tier.dto';
import { CreateMaintenanceScheduleDto } from './dto/create-maintenance-schedule.dto';
import { ListAmcSubscribersQueryDto } from './dto/list-amc-subscribers-query.dto';
import { UpdateAmcTierDto } from './dto/update-amc-tier.dto';
import { UpdateMaintenanceScheduleDto } from './dto/update-maintenance-schedule.dto';
import { UpdateWorkshopAmcStatusDto } from './dto/update-workshop-amc-status.dto';
import { ListMaintenanceScheduleVehiclesQueryDto } from './dto/list-maintenance-schedule-vehicles-query.dto';
import { WorkshopAmcService } from './workshop-amc.service';

@ApiTags('workshop')
@ApiBearerAuth()
@Controller('workshop/amc')
export class WorkshopAmcController {
  constructor(private readonly amc: WorkshopAmcService) {}

  @Get('tiers')
  @RequireOrganizationContext()
  @RequirePermissions(WorkshopPermissionKeys.VIEW)
  @ApiOperation({ summary: 'List AMC tiers' })
  listTiers(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.amc.listTiers(organizationId, page, pageSize);
  }

  @Get('tiers/:id')
  @RequireOrganizationContext()
  @RequirePermissions(WorkshopPermissionKeys.VIEW)
  @ApiOperation({ summary: 'AMC tier detail' })
  getTier(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.amc.getTier(organizationId, id);
  }

  @Post('tiers')
  @HttpCode(HttpStatus.CREATED)
  @RequireOrganizationContext()
  @RequireAnyPermissions(...WorkshopWriteAny.CREATE)
  @ApiOperation({ summary: 'Create AMC tier' })
  createTier(@Body() dto: CreateAmcTierDto) {
    return this.amc.createTier(dto);
  }

  @Patch('tiers/:id')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...WorkshopWriteAny.UPDATE)
  @ApiOperation({ summary: 'Update AMC tier' })
  updateTier(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAmcTierDto,
  ) {
    return this.amc.updateTier(organizationId, id, dto);
  }

  @Patch('tiers/:id/status')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...WorkshopWriteAny.UPDATE)
  @ApiOperation({
    summary: 'Activate or deactivate AMC tier (reason required for deactivate)',
  })
  updateTierStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkshopAmcStatusDto,
  ) {
    return this.amc.updateTierStatus(user.userId, organizationId, id, dto);
  }

  @Get('schedules')
  @RequireOrganizationContext()
  @RequirePermissions(WorkshopPermissionKeys.VIEW)
  @ApiOperation({ summary: 'List maintenance schedules' })
  listSchedules(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.amc.listSchedules(organizationId, page, pageSize);
  }

  @Get('schedules/:id')
  @RequireOrganizationContext()
  @RequirePermissions(WorkshopPermissionKeys.VIEW)
  @ApiOperation({ summary: 'Maintenance schedule detail' })
  getSchedule(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.amc.getSchedule(organizationId, id);
  }

  @Get('schedules/:id/vehicles')
  @RequireOrganizationContext()
  @RequirePermissions(WorkshopPermissionKeys.VIEW)
  @ApiOperation({
    summary:
      'Vehicles matched to schedule asset class with odometer threshold status',
  })
  listScheduleVehicles(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ListMaintenanceScheduleVehiclesQueryDto,
  ) {
    return this.amc.listScheduleVehicles(
      query.organizationId,
      id,
      query.page,
      query.pageSize,
    );
  }

  @Post('schedules')
  @HttpCode(HttpStatus.CREATED)
  @RequireOrganizationContext()
  @RequireAnyPermissions(...WorkshopWriteAny.CREATE)
  @ApiOperation({ summary: 'Create maintenance schedule' })
  createSchedule(@Body() dto: CreateMaintenanceScheduleDto) {
    return this.amc.createSchedule(dto);
  }

  @Patch('schedules/:id')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...WorkshopWriteAny.UPDATE)
  @ApiOperation({ summary: 'Update maintenance schedule' })
  updateSchedule(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMaintenanceScheduleDto,
  ) {
    return this.amc.updateSchedule(organizationId, id, dto);
  }

  @Patch('schedules/:id/status')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...WorkshopWriteAny.UPDATE)
  @ApiOperation({
    summary:
      'Activate or deactivate maintenance schedule (reason required for deactivate)',
  })
  updateScheduleStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkshopAmcStatusDto,
  ) {
    return this.amc.updateScheduleStatus(user.userId, organizationId, id, dto);
  }

  @Get('subscribers')
  @RequireOrganizationContext()
  @RequirePermissions(WorkshopPermissionKeys.VIEW)
  @ApiOperation({ summary: 'List AMC subscribers' })
  listSubscribers(@Query() query: ListAmcSubscribersQueryDto) {
    return this.amc.listSubscribers(query);
  }

  @Get('subscribers/by-code/:subscriberCode')
  @RequireOrganizationContext()
  @RequirePermissions(WorkshopPermissionKeys.VIEW)
  @ApiOperation({ summary: 'AMC subscriber detail by fleet code' })
  getSubscriberByCode(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('subscriberCode') subscriberCode: string,
  ) {
    return this.amc.getSubscriberByCode(organizationId, subscriberCode);
  }

  @Post('subscribers')
  @HttpCode(HttpStatus.CREATED)
  @RequireOrganizationContext()
  @RequireAnyPermissions(...WorkshopWriteAny.CREATE)
  @ApiOperation({ summary: 'Subscribe a vehicle to an AMC tier' })
  createSubscriber(@Body() dto: CreateAmcSubscriberDto) {
    return this.amc.createSubscriber(dto);
  }
}
