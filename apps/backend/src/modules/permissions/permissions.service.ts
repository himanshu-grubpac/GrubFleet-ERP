import { Injectable } from '@nestjs/common';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  toPaginatedResult,
  type PaginatedResult,
} from '../../common/dto/pagination-query.dto';
import { resolveListSort } from '../../common/utils/list-sort.util';
import {
  PERMISSION_CATALOG_LIST_DEFAULT_SORT,
  PERMISSION_CATALOG_LIST_SORT_FIELDS,
} from './constants/permissions-list-sort.constants';
import type { ListPermissionsQueryDto } from './dto/list-permissions-query.dto';
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
    query: ListPermissionsQueryDto,
  ): Promise<PaginatedResult<PermissionCatalogItemDto>> {
    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const sort = resolveListSort(
      PERMISSION_CATALOG_LIST_SORT_FIELDS,
      { sortBy: query.sortBy, sortOrder: query.sortOrder },
      PERMISSION_CATALOG_LIST_DEFAULT_SORT,
    );
    const { rows, total } = await this.permissionsRepository.listCatalog(
      page,
      pageSize,
      sort,
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
