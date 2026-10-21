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
  LIST_SORT_ORDERS,
  type ListSortOrder,
} from '../../../common/constants/list-sort.constants';
import {
  WORKSHOP_TECHNICIAN_LIST_SORT_FIELDS,
  type WorkshopTechnicianListSortField,
} from '../constants/workshop-list-sort.constants';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
} from '../../../common/dto/pagination-query.dto';
import { WORKSHOP_LIST_MAX_PAGE_SIZE } from './list-labor-job-cards-query.dto';

export class ListWorkshopTechniciansQueryDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: WORKSHOP_TECHNICIAN_LIST_SORT_FIELDS })
  @IsOptional()
  @IsIn(WORKSHOP_TECHNICIAN_LIST_SORT_FIELDS)
  sortBy?: WorkshopTechnicianListSortField;

  @ApiPropertyOptional({ enum: LIST_SORT_ORDERS })
  @IsOptional()
  @IsIn(LIST_SORT_ORDERS)
  sortOrder?: ListSortOrder;
}
