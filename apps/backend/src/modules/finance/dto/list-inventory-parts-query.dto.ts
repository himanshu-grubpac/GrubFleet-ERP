import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { FINANCE_INVENTORY_PART_LIST_SORT_FIELDS, type FinanceInventoryPartListSortField } from '../constants/finance-list-sort.constants';
import { SortByQuery } from '../../../common/decorators/list-sort-by.decorator';

export class ListInventoryPartsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsUUID()
  organizationId!: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
  @SortByQuery(FINANCE_INVENTORY_PART_LIST_SORT_FIELDS)
  sortBy?: FinanceInventoryPartListSortField;
}
