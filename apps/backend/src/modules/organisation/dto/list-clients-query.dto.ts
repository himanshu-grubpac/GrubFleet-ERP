import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ORGANISATION_LIST_SEARCH_MAX_LENGTH } from '../constants/organisation-field.constants';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  type ListSortOrder,
} from '../../../common/dto/pagination-query.dto';
import { LIST_SORT_ORDERS } from '../../../common/constants/list-sort.constants';
import {
  CLIENT_LIST_SORT_FIELDS,
  type ClientListSortField,
} from '../constants/organisation-list-sort.constants';

export const CLIENT_LIST_MAX_PAGE_SIZE = 50;

export class ListOrganisationClientsQueryDto {
  @ApiPropertyOptional()
  @IsUUID()
  organizationId!: string;

  @ApiPropertyOptional({ minimum: 1, default: DEFAULT_PAGE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = DEFAULT_PAGE;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: CLIENT_LIST_MAX_PAGE_SIZE,
    default: DEFAULT_PAGE_SIZE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(CLIENT_LIST_MAX_PAGE_SIZE)
  pageSize?: number = DEFAULT_PAGE_SIZE;

  @ApiPropertyOptional({ maxLength: ORGANISATION_LIST_SEARCH_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(ORGANISATION_LIST_SEARCH_MAX_LENGTH)
  search?: string;

  @ApiPropertyOptional({ enum: ['active', 'inactive'] })
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';

  @ApiPropertyOptional({ enum: CLIENT_LIST_SORT_FIELDS })
  @IsOptional()
  @IsIn(CLIENT_LIST_SORT_FIELDS)
  sortBy?: ClientListSortField;

  @ApiPropertyOptional({ enum: LIST_SORT_ORDERS })
  @IsOptional()
  @IsIn(LIST_SORT_ORDERS)
  sortOrder?: ListSortOrder;
}
