import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { LEASE_CHANGE_HISTORY_SORT_FIELDS, type LeaseChangeHistorySortField } from '../constants/fleet-leasing-list-sort.constants';
import { SortByQuery } from '../../../common/decorators/list-sort-by.decorator';

export class LeaseContractChangeHistoryQueryDto extends PaginationQueryDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;
  @SortByQuery(LEASE_CHANGE_HISTORY_SORT_FIELDS)
  sortBy?: LeaseChangeHistorySortField;
}
