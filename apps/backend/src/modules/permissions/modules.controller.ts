import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ERP_MODULES } from '../auth/authorization/constants/erp-module-registry';
import { RequireOrganizationContext } from '../auth/authorization/decorators/require-organization-context.decorator';
import { RequirePermissions } from '../auth/authorization/decorators/require-permissions.decorator';
import { PermissionKeys } from '../auth/authorization/constants/permission-keys';

class ModulesListQueryDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;
}

@ApiTags('modules')
@ApiBearerAuth()
@Controller('modules')
export class ModulesController {
  @Get()
  @RequireOrganizationContext()
  @RequirePermissions(PermissionKeys.ADMINISTRATION_VIEW)
  @ApiOperation({
    summary: 'Sidebar modules for role editor (Phase 1 — no sub-nav)',
  })
  list(@Query() query: ModulesListQueryDto): {
    items: Array<{
      id: string;
      label: string;
      sortOrder: number;
      supportsManage: boolean;
    }>;
  } {
    void query.organizationId;
    return {
      items: ERP_MODULES.map((m) => ({
        id: m.id,
        label: m.label,
        sortOrder: m.sortOrder,
        supportsManage: m.supportsManage,
      })),
    };
  }
}
