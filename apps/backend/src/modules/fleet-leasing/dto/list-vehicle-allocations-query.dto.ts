import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { VEHICLE_ALLOCATION_LIST_SORT_FIELDS, type VehicleAllocationListSortField } from '../constants/fleet-leasing-list-sort.constants';
import { SortByQuery } from '../../../common/decorators/list-sort-by.decorator';

export class ListVehicleAllocationsQueryDto extends PaginationQueryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  organizationId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  contractId?: string;
  @SortByQuery(VEHICLE_ALLOCATION_LIST_SORT_FIELDS)
  sortBy?: VehicleAllocationListSortField;
}
