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
import { INVENTORY_LIST_SEARCH_MAX_LENGTH } from '../constants/inventory-field.constants';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
} from '../../../common/dto/pagination-query.dto';
import {
  LIST_SORT_ORDERS,
  type ListSortOrder,
} from '../../../common/constants/list-sort.constants';

export const INVENTORY_LIST_MAX_PAGE_SIZE = 50;

export class ListInventoryQueryDto {
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
    maximum: INVENTORY_LIST_MAX_PAGE_SIZE,
    default: DEFAULT_PAGE_SIZE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(INVENTORY_LIST_MAX_PAGE_SIZE)
  pageSize?: number = DEFAULT_PAGE_SIZE;

  @ApiPropertyOptional({ maxLength: INVENTORY_LIST_SEARCH_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(INVENTORY_LIST_SEARCH_MAX_LENGTH)
  search?: string;

  @ApiPropertyOptional({ enum: ['active', 'inactive'] })
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';

  @ApiPropertyOptional({ enum: LIST_SORT_ORDERS })
  @IsOptional()
  @IsIn(LIST_SORT_ORDERS)
  sortOrder?: ListSortOrder;

  @ApiPropertyOptional({
    description:
      'Sort field (inventory part, stock receipt, or parts request list)',
  })
  @IsOptional()
  @IsString()
  sortBy?: string;
}
