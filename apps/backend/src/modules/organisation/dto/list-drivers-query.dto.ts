import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  type ListSortOrder,
} from '../../../common/dto/pagination-query.dto';
import { LIST_SORT_ORDERS } from '../../../common/constants/list-sort.constants';
import {
  DRIVER_LIST_SORT_FIELDS,
  type DriverListSortField,
} from '../constants/organisation-list-sort.constants';

export const DRIVER_LIST_MAX_PAGE_SIZE = 50;

export class ListDriversQueryDto {
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
    maximum: DRIVER_LIST_MAX_PAGE_SIZE,
    default: DEFAULT_PAGE_SIZE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(DRIVER_LIST_MAX_PAGE_SIZE)
  pageSize?: number = DEFAULT_PAGE_SIZE;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: ['active', 'inactive', 'license-expired'],
  })
  @IsOptional()
  @IsIn(['active', 'inactive', 'license-expired'])
  status?: 'active' | 'inactive' | 'license-expired';

  @ApiPropertyOptional({ enum: DRIVER_LIST_SORT_FIELDS })
  @IsOptional()
  @IsIn(DRIVER_LIST_SORT_FIELDS)
  sortBy?: DriverListSortField;

  @ApiPropertyOptional({ enum: LIST_SORT_ORDERS })
  @IsOptional()
  @IsIn(LIST_SORT_ORDERS)
  sortOrder?: ListSortOrder;
}
