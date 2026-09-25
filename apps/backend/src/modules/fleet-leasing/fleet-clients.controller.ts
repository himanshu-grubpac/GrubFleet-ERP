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
import { RequireAnyPermissions } from '../auth/authorization/decorators/require-any-permissions.decorator';
import { RequireOrganizationContext } from '../auth/authorization/decorators/require-organization-context.decorator';
import { RequirePermissions } from '../auth/authorization/decorators/require-permissions.decorator';
import {
  FleetLeasingPermissionKeys,
  FleetLeasingWriteAny,
} from './constants/fleet-leasing-permission-keys';
import { CreateFleetClientDto } from './dto/create-fleet-client.dto';
import { ListFleetClientsQueryDto } from './dto/list-fleet-clients-query.dto';
import { UpdateFleetClientDto } from './dto/update-fleet-client.dto';
import { FleetClientsService } from './fleet-clients.service';

@ApiTags('fleet-leasing')
@ApiBearerAuth()
@Controller('fleet-leasing/clients')
export class FleetClientsController {
  constructor(private readonly clients: FleetClientsService) {}

  @Get()
  @RequireOrganizationContext()
  @RequirePermissions(FleetLeasingPermissionKeys.VIEW)
  @ApiOperation({
    summary:
      'Customer / client register — search by company or POC (wizard step 1)',
  })
  list(@Query() query: ListFleetClientsQueryDto) {
    return this.clients.list(query);
  }

  @Get(':id')
  @RequireOrganizationContext()
  @RequirePermissions(FleetLeasingPermissionKeys.VIEW)
  @ApiOperation({ summary: 'Client detail with all points of contact' })
  getOne(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.clients.getById(organizationId, id);
  }

  @Post()
  @RequireOrganizationContext()
  @RequireAnyPermissions(...FleetLeasingWriteAny.CREATE)
  @ApiOperation({ summary: 'Save new client record (shared register Flow 39)' })
  create(@Body() dto: CreateFleetClientDto) {
    return this.clients.create(dto);
  }

  @Patch(':id')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...FleetLeasingWriteAny.UPDATE)
  @ApiOperation({ summary: 'Update client company fields and POC rows' })
  update(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFleetClientDto,
  ) {
    return this.clients.update(organizationId, id, dto);
  }
}
