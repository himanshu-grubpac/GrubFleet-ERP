import { Injectable } from '@nestjs/common';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  toPaginatedResult,
  type PaginatedResult,
} from '../../common/dto/pagination-query.dto';
import { PermissionsRepository } from './permissions.repository';

export type PermissionCatalogItemDto = {
  id: string;
  key: string;
  module: string;
  action: string;
  description: string | null;
};

@Injectable()
export class PermissionsService {
  constructor(private readonly permissionsRepository: PermissionsRepository) {}

  async listPermissions(
    page = DEFAULT_PAGE,
    pageSize = DEFAULT_PAGE_SIZE,
  ): Promise<PaginatedResult<PermissionCatalogItemDto>> {
    const { rows, total } = await this.permissionsRepository.listCatalog(
      page,
      pageSize,
    );
    return toPaginatedResult(
      rows.map((p) => ({
        id: p.id,
        key: p.key,
        module: p.module,
        action: p.action,
        description: p.description,
      })),
      page,
      pageSize,
      total,
    );
  }
}
