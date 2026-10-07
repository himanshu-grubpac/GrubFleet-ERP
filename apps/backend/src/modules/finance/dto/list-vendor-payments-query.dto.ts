import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ListVendorPaymentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsUUID()
  organizationId!: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @MaxLength(120)
  search?: string;
}

export class ListVendorPaymentPurchaseInvoicesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsUUID()
  organizationId!: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @MaxLength(120)
  search?: string;
}

export class VendorPaymentDetailQueryDto {
  @ApiPropertyOptional()
  @IsUUID()
  organizationId!: string;
}
