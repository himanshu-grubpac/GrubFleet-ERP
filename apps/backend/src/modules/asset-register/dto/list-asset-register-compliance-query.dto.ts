import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { SortByQuery } from '../../../common/decorators/list-sort-by.decorator';
import {
  ASSET_COMPLIANCE_LIST_SORT_FIELDS,
  type AssetComplianceListSortField,
} from '../constants/asset-register-list-sort.constants';

export enum AssetRegisterComplianceFilterStatus {
  ALL = 'all',
  EXPIRED = 'expired',
  EXPIRING_SOON = 'expiring_soon',
  VALID = 'valid',
}

export class ListAssetRegisterComplianceQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsUUID()
  organizationId!: string;

  @ApiPropertyOptional({ enum: AssetRegisterComplianceFilterStatus })
  @IsOptional()
  @IsEnum(AssetRegisterComplianceFilterStatus)
  complianceStatus?: AssetRegisterComplianceFilterStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assetClassId?: string;

  @SortByQuery(ASSET_COMPLIANCE_LIST_SORT_FIELDS)
  sortBy?: AssetComplianceListSortField;
}
