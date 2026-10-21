import { Injectable } from '@nestjs/common';
import { resolveListSort } from '../../common/utils/list-sort.util';
import {
  AUDIT_LIST_DEFAULT_SORT,
  AUDIT_LIST_SORT_FIELDS,
} from './constants/audit-list-sort.constants';
import type { ListAuditQueryDto } from './dto/list-audit-query.dto';
import { AuditRepository, type AuditLogInsert } from './audit.repository';

@Injectable()
export class AuditService {
  constructor(private readonly auditRepository: AuditRepository) {}

  async log(entry: AuditLogInsert): Promise<void> {
    await this.auditRepository.insert(entry);
  }

  async listOrganizationAuditLogs(query: ListAuditQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const sort = resolveListSort(
      AUDIT_LIST_SORT_FIELDS,
      { sortBy: query.sortBy, sortOrder: query.sortOrder },
      AUDIT_LIST_DEFAULT_SORT,
    );
    const { rows, total } = await this.auditRepository.listForOrganization(
      query.organizationId,
      page,
      pageSize,
      sort,
    );
    return { rows, total };
  }
}
