import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import {
  LIST_SORT_ORDERS,
  type ListSortOrder,
} from '../../../common/constants/list-sort.constants';
import {
  AMC_SUBSCRIBER_LIST_SORT_FIELDS,
  type AmcSubscriberListSortField,
} from '../constants/workshop-list-sort.constants';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
} from '../../../common/dto/pagination-query.dto';
import { WORKSHOP_LIST_MAX_PAGE_SIZE } from './list-labor-job-cards-query.dto';

export class ListAmcSubscribersQueryDto {
  @ApiPropertyOptional()
  @IsUUID()
  organizationId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  amcTierId?: string;

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

  @ApiPropertyOptional({ enum: AMC_SUBSCRIBER_LIST_SORT_FIELDS })
  @IsOptional()
  @IsIn(AMC_SUBSCRIBER_LIST_SORT_FIELDS)
  sortBy?: AmcSubscriberListSortField;

  @ApiPropertyOptional({ enum: LIST_SORT_ORDERS })
  @IsOptional()
  @IsIn(LIST_SORT_ORDERS)
  sortOrder?: ListSortOrder;
}
