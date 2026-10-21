import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  INVOICE_LIST_SORT_FIELDS,
  type InvoiceListSortField,
} from '../constants/finance-list-sort.constants';
import { SortByQuery } from '../../../common/decorators/list-sort-by.decorator';
import {
  FINANCE_INVOICE_STATUSES,
  FINANCE_INVOICE_TYPES,
  type FinanceInvoiceStatus,
  type FinanceInvoiceType,
} from '../constants/invoice.constants';

export class ListInvoicesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsUUID()
  organizationId!: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ enum: FINANCE_INVOICE_STATUSES })
  @IsOptional()
  @IsIn([...FINANCE_INVOICE_STATUSES])
  status?: FinanceInvoiceStatus;

  @ApiPropertyOptional({ enum: FINANCE_INVOICE_TYPES })
  @IsOptional()
  @IsIn([...FINANCE_INVOICE_TYPES])
  invoiceType?: FinanceInvoiceType;
  @SortByQuery(INVOICE_LIST_SORT_FIELDS)
  sortBy?: InvoiceListSortField;
}
