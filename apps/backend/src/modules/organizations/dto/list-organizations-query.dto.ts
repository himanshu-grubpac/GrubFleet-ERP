import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { SortByQuery } from '../../../common/decorators/list-sort-by.decorator';
import {
  ORGANIZATION_LIST_SORT_FIELDS,
  type OrganizationListSortField,
} from '../constants/organizations-list-sort.constants';

export class ListOrganizationsQueryDto extends PaginationQueryDto {
  @SortByQuery(ORGANIZATION_LIST_SORT_FIELDS)
  sortBy?: OrganizationListSortField;
}
