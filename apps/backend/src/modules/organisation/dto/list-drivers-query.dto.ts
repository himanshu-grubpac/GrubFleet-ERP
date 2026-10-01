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
} from '../../../common/dto/pagination-query.dto';

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
}
