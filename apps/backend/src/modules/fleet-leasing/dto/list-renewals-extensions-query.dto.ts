import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { RENEWALS_EXTENSION_LIST_SORT_FIELDS, type RenewalsExtensionListSortField } from '../constants/fleet-leasing-list-sort.constants';
import { SortByQuery } from '../../../common/decorators/list-sort-by.decorator';

export class ListRenewalsExtensionsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsUUID()
  organizationId!: string;

  @ApiPropertyOptional({ description: 'Contract ID or client name' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
  @SortByQuery(RENEWALS_EXTENSION_LIST_SORT_FIELDS)
  sortBy?: RenewalsExtensionListSortField;
}
