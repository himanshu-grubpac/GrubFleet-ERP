import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  FLEET_RETURN_LIST_SORT_FIELDS,
  type FleetReturnListSortField,
} from '../constants/fleet-leasing-list-sort.constants';
import {
  FLEET_RETURN_LIST_PIPELINE_TABS,
  type FleetReturnListPipelineTab,
} from '../constants/fleet-return-list-pipeline.constants';
import { LEASE_CLOSING_REASONS } from './initiate-returns.dto';
import { SortByQuery } from '../../../common/decorators/list-sort-by.decorator';

export class ListFleetReturnsQueryDto extends PaginationQueryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  organizationId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  contractId?: string;
  @SortByQuery(FLEET_RETURN_LIST_SORT_FIELDS)
  sortBy?: FleetReturnListSortField;

  @ApiPropertyOptional({
    description: 'Filter by linked fleet vehicle status',
    enum: [
      'available',
      'inbound',
      'reserved',
      'leased',
      'return_pending',
      'returned',
      'workshop',
      'sold',
      'retired',
    ],
  })
  @IsOptional()
  @IsIn([
    'available',
    'inbound',
    'reserved',
    'leased',
    'return_pending',
    'returned',
    'workshop',
    'sold',
    'retired',
  ])
  vehicleStatus?: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({
    description:
      'Figma pipeline tab filter (takes precedence over vehicleStatus when set)',
    enum: FLEET_RETURN_LIST_PIPELINE_TABS,
  })
  @IsOptional()
  @IsIn([...FLEET_RETURN_LIST_PIPELINE_TABS])
  pipelineTab?: FleetReturnListPipelineTab;

  @ApiPropertyOptional({
    description:
      'When true, response includes tabCounts for all pipeline tabs (ignores search filter for counts)',
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeTabCounts?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by lease closing reason (Figma “Any reason” dropdown)',
    enum: LEASE_CLOSING_REASONS,
  })
  @IsOptional()
  @IsIn([...LEASE_CLOSING_REASONS])
  closingReason?: (typeof LEASE_CLOSING_REASONS)[number];

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Filter by return depot organisation location',
  })
  @IsOptional()
  @IsUUID()
  returnDepotLocationId?: string;

  @ApiPropertyOptional({
    maxLength: 120,
    description:
      'Filter by return depot free-text label when no location id was stored',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  returnDepotLabel?: string;
}
