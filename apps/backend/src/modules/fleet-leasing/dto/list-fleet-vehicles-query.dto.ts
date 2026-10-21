import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { SortByQuery } from '../../../common/decorators/list-sort-by.decorator';
import {
  FLEET_VEHICLE_LIST_SORT_FIELDS,
  type FleetVehicleListSortField,
} from '../constants/fleet-leasing-list-sort.constants';

export class ListFleetVehiclesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsUUID()
  organizationId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  assetClass?: string;

  @SortByQuery(FLEET_VEHICLE_LIST_SORT_FIELDS)
  sortBy?: FleetVehicleListSortField;
}
