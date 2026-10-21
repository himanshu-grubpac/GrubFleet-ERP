import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { SortByQuery } from '../../../common/decorators/list-sort-by.decorator';
import {
  PERMISSION_CATALOG_LIST_SORT_FIELDS,
  type PermissionCatalogListSortField,
} from '../constants/permissions-list-sort.constants';

export class ListPermissionsQueryDto extends PaginationQueryDto {
  @SortByQuery(PERMISSION_CATALOG_LIST_SORT_FIELDS)
  sortBy?: PermissionCatalogListSortField;
}
