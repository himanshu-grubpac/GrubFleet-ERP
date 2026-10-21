import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  USER_LIST_SORT_FIELDS,
  type UserListSortField,
} from '../constants/users-list-sort.constants';
import { SortByQuery } from '../../../common/decorators/list-sort-by.decorator';

export class ListUsersQueryDto extends PaginationQueryDto {
  @ApiProperty({ description: 'Organization scope for member list' })
  @IsUUID()
  organizationId!: string;
  @SortByQuery(USER_LIST_SORT_FIELDS)
  sortBy?: UserListSortField;
}
