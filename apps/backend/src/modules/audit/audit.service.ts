import { Injectable } from '@nestjs/common';
import { AuditRepository, type AuditLogInsert } from './audit.repository';

@Injectable()
export class AuditService {
  constructor(private readonly auditRepository: AuditRepository) {}

  async log(entry: AuditLogInsert): Promise<void> {
    await this.auditRepository.insert(entry);
  }

  async listOrganizationAuditLogs(
    organizationId: string,
    page: number,
    pageSize: number,
  ) {
    const { rows, total } = await this.auditRepository.listForOrganization(
      organizationId,
      page,
      pageSize,
    );
    return { rows, total };
  }
}
