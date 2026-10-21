import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { SUPPORT_PAGINATED_LIST_SORT_FIELDS, type SupportPaginatedListSortField } from '../constants/fleet-leasing-list-sort.constants';
import { SortByQuery } from '../../../common/decorators/list-sort-by.decorator';

/** Shared page/pageSize query for fleet support sub-routes. */
export class ListSupportPaginatedQueryDto extends PaginationQueryDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;
  @SortByQuery(SUPPORT_PAGINATED_LIST_SORT_FIELDS)
  sortBy?: SupportPaginatedListSortField;
}
