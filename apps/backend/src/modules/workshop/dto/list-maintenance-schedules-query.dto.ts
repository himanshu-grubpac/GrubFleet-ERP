import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { SortByQuery } from '../../../common/decorators/list-sort-by.decorator';
import {
  MAINTENANCE_SCHEDULE_LIST_SORT_FIELDS,
  type MaintenanceScheduleListSortField,
} from '../constants/workshop-list-sort.constants';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  PaginationQueryDto,
} from '../../../common/dto/pagination-query.dto';
import { WORKSHOP_LIST_MAX_PAGE_SIZE } from './list-labor-job-cards-query.dto';

export class ListMaintenanceSchedulesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsUUID()
  organizationId!: string;

  @ApiPropertyOptional({ minimum: 1, default: DEFAULT_PAGE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  declare page?: number;

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
  declare pageSize?: number;

  @SortByQuery(MAINTENANCE_SCHEDULE_LIST_SORT_FIELDS)
  sortBy?: MaintenanceScheduleListSortField;
}
