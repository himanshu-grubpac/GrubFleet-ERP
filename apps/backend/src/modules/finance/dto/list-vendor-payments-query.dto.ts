import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  VENDOR_PAYMENT_LIST_SORT_FIELDS,
  type VendorPaymentListSortField,
} from '../constants/finance-list-sort.constants';
import { SortByQuery } from '../../../common/decorators/list-sort-by.decorator';

export class ListVendorPaymentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsUUID()
  organizationId!: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @SortByQuery(VENDOR_PAYMENT_LIST_SORT_FIELDS)
  sortBy?: VendorPaymentListSortField;
}

export class ListVendorPaymentPurchaseInvoicesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsUUID()
  organizationId!: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}

export class VendorPaymentDetailQueryDto {
  @ApiPropertyOptional()
  @IsUUID()
  organizationId!: string;
}
