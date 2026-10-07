import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateBillingInvoiceDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;

  @ApiProperty({ description: 'Organisation client register id' })
  @IsUUID()
  clientId!: string;

  @ApiProperty()
  @IsUUID()
  leaseContractId!: string;

  @ApiProperty({ maxLength: 120 })
  @MaxLength(120)
  billingPeriod!: string;

  @ApiProperty({
    description: 'Billing amount in minor currency units (paise for INR)',
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  totalAmountMinor!: number;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  invoiceDate!: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}
