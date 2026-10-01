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
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { ListSuppliersQueryDto } from './dto/list-suppliers-query.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { UpdateSupplierStatusDto } from './dto/update-supplier-status.dto';
import { SuppliersService } from './suppliers.service';

@ApiTags('organisation')
@ApiBearerAuth()
@Controller('organisation/suppliers')
export class SuppliersController {
  constructor(private readonly suppliers: SuppliersService) {}

  @Get()
  @RequireOrganizationContext()
  @RequirePermissions(OrganisationPermissionKeys.VIEW)
  @ApiOperation({
    summary: 'List organisation suppliers (paginated)',
    description:
      'Default sort: createdAt descending (newest first), then id descending.',
  })
  list(@Query() query: ListSuppliersQueryDto) {
    return this.suppliers.list(query);
  }

  @Get('types')
  @RequireOrganizationContext()
  @RequirePermissions(OrganisationPermissionKeys.VIEW)
  @ApiOperation({
    summary: 'Catalog of organisation supplier types (fixed product enum)',
  })
  listTypes(@Query('organizationId', ParseUUIDPipe) organizationId: string) {
    return this.suppliers.listSupplierTypes(organizationId);
  }

  @Get(':id')
  @RequireOrganizationContext()
  @RequirePermissions(OrganisationPermissionKeys.VIEW)
  @ApiOperation({ summary: 'Supplier detail with optional linked sections' })
  getOne(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.suppliers.getById(organizationId, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireOrganizationContext()
  @RequireAnyPermissions(...OrganisationWriteAny.CREATE)
  @ApiOperation({ summary: 'Create organisation supplier' })
  create(@Body() dto: CreateSupplierDto) {
    return this.suppliers.create(dto);
  }

  @Patch(':id')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...OrganisationWriteAny.UPDATE)
  @ApiOperation({ summary: 'Update organisation supplier' })
  update(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.suppliers.update(organizationId, id, dto);
  }

  @Patch(':id/status')
  @RequireOrganizationContext()
  @RequireAnyPermissions(...OrganisationWriteAny.UPDATE)
  @ApiOperation({
    summary: 'Activate or deactivate supplier (reason required for deactivate)',
  })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSupplierStatusDto,
  ) {
    return this.suppliers.updateStatus(user.userId, organizationId, id, dto);
  }
}
