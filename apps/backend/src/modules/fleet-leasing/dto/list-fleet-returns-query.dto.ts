import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  FLEET_RETURN_LIST_SORT_FIELDS,
  type FleetReturnListSortField,
} from '../constants/fleet-leasing-list-sort.constants';
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
}
