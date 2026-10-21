import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  LEASE_CONTRACT_LIST_SORT_FIELDS,
  type LeaseContractListSortField,
} from '../constants/fleet-leasing-list-sort.constants';
import { SortByQuery } from '../../../common/decorators/list-sort-by.decorator';
import { LIST_STATUS_FILTER } from '../constants/lease-contract-status';

export class ListLeaseContractsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsUUID()
  organizationId!: string;

  @ApiPropertyOptional({
    enum: Object.keys(LIST_STATUS_FILTER),
    default: 'all',
  })
  @IsOptional()
  @IsIn(Object.keys(LIST_STATUS_FILTER))
  statusFilter?: keyof typeof LIST_STATUS_FILTER = 'all';

  @ApiPropertyOptional({ description: 'Contract ID or client name' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
  @SortByQuery(LEASE_CONTRACT_LIST_SORT_FIELDS)
  sortBy?: LeaseContractListSortField;
}
