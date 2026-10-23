import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { ORGANISATION_LIST_SEARCH_MAX_LENGTH } from '../../organisation/constants/organisation-field.constants';
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

  @ApiPropertyOptional({ maxLength: ORGANISATION_LIST_SEARCH_MAX_LENGTH })
  @IsOptional()
  @MaxLength(ORGANISATION_LIST_SEARCH_MAX_LENGTH)
  search?: string;
}
