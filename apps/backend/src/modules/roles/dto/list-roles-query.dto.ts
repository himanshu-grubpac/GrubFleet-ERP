import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  ROLE_LIST_SORT_FIELDS,
  type RoleListSortField,
} from '../constants/roles-list-sort.constants';
import { SortByQuery } from '../../../common/decorators/list-sort-by.decorator';

export class ListRolesQueryDto extends PaginationQueryDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;
  @SortByQuery(ROLE_LIST_SORT_FIELDS)
  sortBy?: RoleListSortField;
}
