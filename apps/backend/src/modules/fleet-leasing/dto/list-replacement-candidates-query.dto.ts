import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { REPLACEMENT_CANDIDATE_LIST_SORT_FIELDS, type ReplacementCandidateListSortField } from '../constants/fleet-leasing-list-sort.constants';
import { SortByQuery } from '../../../common/decorators/list-sort-by.decorator';
import { ASSET_REGISTER_VEHICLE_TYPES } from '../../asset-register/constants/asset-class.constants';
import {
  SUPPORT_REPLACEMENT_VEHICLE_STORES,
  type SupportReplacementVehicleStore,
} from '../constants/support-replacement-vehicle-store';

export class ListReplacementCandidatesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsUUID()
  organizationId!: string;

  @ApiPropertyOptional({
    description: 'Legacy filter by asset class display name (optional)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  assetClass?: string;

  @ApiPropertyOptional({ enum: ASSET_REGISTER_VEHICLE_TYPES })
  @IsOptional()
  @IsIn([...ASSET_REGISTER_VEHICLE_TYPES])
  vehicleType?: (typeof ASSET_REGISTER_VEHICLE_TYPES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  brand?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  modelName?: string;

  @ApiPropertyOptional({
    description: 'Comma-separated vehicle UUIDs to exclude from results',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  excludeVehicleIds?: string;

  @ApiPropertyOptional({
    enum: SUPPORT_REPLACEMENT_VEHICLE_STORES,
    description:
      'When set, only vehicles from that catalog (legacy fleet table or asset register)',
  })
  @IsOptional()
  @IsIn([...SUPPORT_REPLACEMENT_VEHICLE_STORES])
  sourceKind?: SupportReplacementVehicleStore;
  @SortByQuery(REPLACEMENT_CANDIDATE_LIST_SORT_FIELDS)
  sortBy?: ReplacementCandidateListSortField;
}
