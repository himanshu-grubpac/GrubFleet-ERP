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
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { ListWorkOrdersQueryDto } from './dto/list-work-orders-query.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import { UpdateWorkOrderStatusDto } from './dto/update-work-order-status.dto';
import { WorkOrdersService } from './work-orders.service';

@ApiTags('workshop')
@ApiBearerAuth()
@Controller('workshop/work-orders')
export class WorkOrdersController {
  constructor(private readonly workOrders: WorkOrdersService) {}

  @Get()
  @RequireOrganizationContext()
  @RequirePermissions(WorkshopPermissionKeys.VIEW)
  @ApiOperation({
    summary: 'List work orders (paginated)',
    description: 'Default sort: createdAt desc.',
  })
  list(@Query() query: ListWorkOrdersQueryDto) {
    return this.workOrders.list(query);
  }

  @Get(':id')
  @RequireOrganizationContext()
  @RequirePermissions(WorkshopPermissionKeys.VIEW)
  @ApiOperation({
    summary: 'Work order detail with fleet, parts, and labor lines',
  })
  getOne(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.workOrders.getById(organizationId, id, user.userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireOrganizationContext()
  @RequireAnyPermissions(...WorkshopWriteAny.CREATE)
  @ApiOperation({
    summary: 'Create work order',
    description:
      'Links asset register vehicle, optional labor job card template (parts + labor), additional parts/labor, and optional technician employee.',
  })
  create(@Body() dto: CreateWorkOrderDto) {
    return this.workOrders.create(dto);
  }

  @Patch(':id')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...WorkshopWriteAny.UPDATE)
  @ApiOperation({ summary: 'Update work order header fields' })
  update(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkOrderDto,
  ) {
    return this.workOrders.update(organizationId, id, dto);
  }

  @Patch(':id/status')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...WorkshopWriteAny.UPDATE)
  @ApiOperation({
    summary: 'Start, close, or cancel work order',
  })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkOrderStatusDto,
  ) {
    return this.workOrders.updateStatus(user.userId, organizationId, id, dto);
  }
}
