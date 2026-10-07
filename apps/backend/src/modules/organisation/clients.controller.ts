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
  OrganisationPermissionKeys,
  OrganisationWriteAny,
} from './constants/organisation-permission-keys';
import { ClientsService } from './clients.service';
import { CreateOrganisationClientDto } from './dto/create-client.dto';
import { ListOrganisationClientsQueryDto } from './dto/list-clients-query.dto';
import { UpdateOrganisationClientDto } from './dto/update-client.dto';
import { UpdateOrganisationClientStatusDto } from './dto/update-client-status.dto';

@ApiTags('organisation')
@ApiBearerAuth()
@Controller('organisation/clients')
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  @Get()
  @RequireOrganizationContext()
  @RequirePermissions(OrganisationPermissionKeys.VIEW)
  @ApiOperation({
    summary: 'List organisation clients (paginated)',
    description:
      'Default sort: createdAt descending (newest first), then id descending.',
  })
  list(@Query() query: ListOrganisationClientsQueryDto) {
    return this.clients.list(query);
  }

  @Get(':id')
  @RequireOrganizationContext()
  @RequirePermissions(OrganisationPermissionKeys.VIEW)
  @ApiOperation({
    summary: 'Organisation client detail',
    description:
      'Contract counts and contractHistory join fleet_clients.organisation_client_id to lease_contracts.',
  })
  getOne(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.clients.getById(organizationId, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireOrganizationContext()
  @RequireAnyPermissions(...OrganisationWriteAny.CREATE)
  @ApiOperation({ summary: 'Create organisation client' })
  create(@Body() dto: CreateOrganisationClientDto) {
    return this.clients.create(dto);
  }

  @Patch(':id')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...OrganisationWriteAny.UPDATE)
  @ApiOperation({ summary: 'Update organisation client' })
  update(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrganisationClientDto,
  ) {
    return this.clients.update(organizationId, id, dto);
  }

  @Patch(':id/status')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...OrganisationWriteAny.UPDATE)
  @ApiOperation({
    summary: 'Activate or deactivate client (reason required for deactivate)',
  })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrganisationClientStatusDto,
  ) {
    return this.clients.updateStatus(user.userId, organizationId, id, dto);
  }
}
