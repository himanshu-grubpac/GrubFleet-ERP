import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  toPaginatedResult,
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
} from '../../common/dto/pagination-query.dto';
import { RequireOrganizationContext } from '../auth/authorization/decorators/require-organization-context.decorator';
import { RequirePermissions } from '../auth/authorization/decorators/require-permissions.decorator';
import { PermissionKeys } from '../auth/authorization/constants/permission-keys';
import { AuditService } from './audit.service';
import { ListAuditQueryDto } from './dto/list-audit-query.dto';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequireOrganizationContext()
  @RequirePermissions(PermissionKeys.ADMINISTRATION_VIEW)
  @ApiOperation({ summary: 'List audit logs for an organization' })
  async list(@Query() query: ListAuditQueryDto) {
    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const { rows, total } = await this.auditService.listOrganizationAuditLogs(
      query.organizationId,
      page,
      pageSize,
    );
    return toPaginatedResult(
      rows.map((log) => ({
        id: log.id,
        organizationId: log.organizationId,
        userId: log.userId,
        action: log.action,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        status: log.status,
        metadata: log.metadata,
        ipAddress: log.ipAddress,
        correlationId: log.correlationId,
        createdAt: log.createdAt.toISOString(),
      })),
      page,
      pageSize,
      total,
    );
  }
}
