import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  type ListSortOrder,
} from '../../../common/dto/pagination-query.dto';
import { LIST_SORT_ORDERS } from '../../../common/constants/list-sort.constants';
import {
  ASSIGNABLE_VEHICLE_LIST_SORT_FIELDS,
  type AssignableVehicleListSortField,
} from '../constants/organisation-list-sort.constants';

export const ASSIGNABLE_VEHICLES_MAX_PAGE_SIZE = 50;

export class ListAssignableVehiclesQueryDto {
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
    maximum: ASSIGNABLE_VEHICLES_MAX_PAGE_SIZE,
    default: DEFAULT_PAGE_SIZE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ASSIGNABLE_VEHICLES_MAX_PAGE_SIZE)
  pageSize?: number = DEFAULT_PAGE_SIZE;

  @ApiPropertyOptional({ enum: ASSIGNABLE_VEHICLE_LIST_SORT_FIELDS })
  @IsOptional()
  @IsIn(ASSIGNABLE_VEHICLE_LIST_SORT_FIELDS)
  sortBy?: AssignableVehicleListSortField;

  @ApiPropertyOptional({ enum: LIST_SORT_ORDERS })
  @IsOptional()
  @IsIn(LIST_SORT_ORDERS)
  sortOrder?: ListSortOrder;
}
