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
import { SortByQuery } from '../../../common/decorators/list-sort-by.decorator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  ASSET_REGISTER_VEHICLE_LIST_SORT_FIELDS,
  type AssetRegisterVehicleListSortField,
} from '../constants/asset-register-list-sort.constants';
import { ASSET_REGISTER_VEHICLE_OPERATIONAL_STATUSES } from '../constants/asset-register-vehicle.constants';

export const ASSET_REGISTER_VEHICLE_LIST_MAX_PAGE_SIZE = 50;

export class ListAssetRegisterVehiclesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsUUID()
  organizationId!: string;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: ASSET_REGISTER_VEHICLE_LIST_MAX_PAGE_SIZE,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ASSET_REGISTER_VEHICLE_LIST_MAX_PAGE_SIZE)
  declare pageSize?: number;

  @ApiPropertyOptional({ description: 'Filter by asset class UUID' })
  @IsOptional()
  @IsUUID()
  assetClassId?: string;

  @ApiPropertyOptional({
    enum: ASSET_REGISTER_VEHICLE_OPERATIONAL_STATUSES,
    description: 'Filter by operational status (available, leased, …)',
  })
  @IsOptional()
  @IsIn([...ASSET_REGISTER_VEHICLE_OPERATIONAL_STATUSES])
  operationalStatus?: (typeof ASSET_REGISTER_VEHICLE_OPERATIONAL_STATUSES)[number];

  @ApiPropertyOptional({ enum: ['active', 'inactive'] })
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';

  @ApiPropertyOptional({
    description: 'Search fleet code or registration number (partial match)',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @SortByQuery(ASSET_REGISTER_VEHICLE_LIST_SORT_FIELDS)
  sortBy?: AssetRegisterVehicleListSortField;
}
