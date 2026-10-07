import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
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
}
