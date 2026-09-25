import { Controller, Get, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { RequireOrganizationContext } from '../auth/authorization/decorators/require-organization-context.decorator';
import { RequirePermissions } from '../auth/authorization/decorators/require-permissions.decorator';
import { PermissionKeys } from '../auth/authorization/constants/permission-keys';
import { PermissionsService } from './permissions.service';

@ApiTags('permissions')
@ApiBearerAuth()
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @RequireOrganizationContext()
  @RequirePermissions(PermissionKeys.ADMINISTRATION_VIEW)
  @ApiOperation({ summary: 'List permission catalog' })
  list(@Query() pagination: PaginationQueryDto, @Req() req: Request) {
    void req.organizationId;
    return this.permissionsService.listPermissions(
      pagination.page,
      pagination.pageSize,
    );
  }
}
