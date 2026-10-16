import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequireOrganizationContext } from '../auth/authorization/decorators/require-organization-context.decorator';
import { RequirePermissions } from '../auth/authorization/decorators/require-permissions.decorator';
import { WorkshopPermissionKeys } from './constants/workshop-permission-keys';
import { ListWorkshopTechniciansQueryDto } from './dto/list-workshop-technicians-query.dto';
import { WorkOrdersService } from './work-orders.service';

@ApiTags('workshop')
@ApiBearerAuth()
@Controller('workshop/technicians')
export class WorkshopTechniciansController {
  constructor(private readonly workOrders: WorkOrdersService) {}

  @Get()
  @RequireOrganizationContext()
  @RequirePermissions(WorkshopPermissionKeys.VIEW)
  @ApiOperation({
    summary: 'List technicians (employees) with open work order counts',
  })
  listTechnicians(@Query() query: ListWorkshopTechniciansQueryDto) {
    return this.workOrders.listTechnicians(query);
  }
}
