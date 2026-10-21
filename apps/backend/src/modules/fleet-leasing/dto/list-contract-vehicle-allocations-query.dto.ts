import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { VEHICLE_ALLOCATION_LIST_SORT_FIELDS, type VehicleAllocationListSortField } from '../constants/fleet-leasing-list-sort.constants';
import { SortByQuery } from '../../../common/decorators/list-sort-by.decorator';

export class ListContractVehicleAllocationsQueryDto extends PaginationQueryDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;
  @SortByQuery(VEHICLE_ALLOCATION_LIST_SORT_FIELDS)
  sortBy?: VehicleAllocationListSortField;
}
