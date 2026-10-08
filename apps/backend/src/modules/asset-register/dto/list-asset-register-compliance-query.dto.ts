import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '../../../common/dto/pagination-query.dto';

export enum AssetRegisterComplianceFilterStatus {
  ALL = 'all',
  EXPIRED = 'expired',
  EXPIRING_SOON = 'expiring_soon',
  VALID = 'valid',
}

export class ListAssetRegisterComplianceQueryDto {
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
    maximum: MAX_PAGE_SIZE,
    default: DEFAULT_PAGE_SIZE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  pageSize?: number = DEFAULT_PAGE_SIZE;

  @ApiPropertyOptional({ enum: AssetRegisterComplianceFilterStatus })
  @IsOptional()
  @IsEnum(AssetRegisterComplianceFilterStatus)
  complianceStatus?: AssetRegisterComplianceFilterStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assetClassId?: string;
}
