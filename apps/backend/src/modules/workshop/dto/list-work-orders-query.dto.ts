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
import { WORKSHOP_LIST_SEARCH_MAX_LENGTH } from '../constants/workshop-field.constants';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
} from '../../../common/dto/pagination-query.dto';
import {
  LIST_SORT_ORDERS,
  type ListSortOrder,
} from '../../../common/constants/list-sort.constants';
import {
  WORK_ORDER_LIST_SORT_FIELDS,
  type WorkOrderListSortField,
} from '../constants/workshop-list-sort.constants';
import { WORKSHOP_LIST_MAX_PAGE_SIZE } from './list-labor-job-cards-query.dto';

const WORK_ORDER_LIST_STATUSES = [
  'open',
  'in_progress',
  'closed',
  'cancelled',
] as const;

export type WorkshopWorkOrderListStatus =
  (typeof WORK_ORDER_LIST_STATUSES)[number];

export class ListWorkOrdersQueryDto {
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
    maximum: WORKSHOP_LIST_MAX_PAGE_SIZE,
    default: DEFAULT_PAGE_SIZE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(WORKSHOP_LIST_MAX_PAGE_SIZE)
  pageSize?: number = DEFAULT_PAGE_SIZE;

  @ApiPropertyOptional({ maxLength: WORKSHOP_LIST_SEARCH_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(WORKSHOP_LIST_SEARCH_MAX_LENGTH)
  search?: string;

  @ApiPropertyOptional({ enum: WORK_ORDER_LIST_STATUSES })
  @IsOptional()
  @IsIn(WORK_ORDER_LIST_STATUSES)
  status?: WorkshopWorkOrderListStatus;

  @ApiPropertyOptional({ enum: WORK_ORDER_LIST_SORT_FIELDS })
  @IsOptional()
  @IsIn(WORK_ORDER_LIST_SORT_FIELDS)
  sortBy?: WorkOrderListSortField;

  @ApiPropertyOptional({ enum: LIST_SORT_ORDERS })
  @IsOptional()
  @IsIn(LIST_SORT_ORDERS)
  sortOrder?: ListSortOrder;
}
