import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  IsNotAfterLocalToday,
  IsYearMonthNotAfterCurrentLocal,
} from '../../../common/decorators/local-calendar-date-bounds.decorator';

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

  @ApiProperty({
    maxLength: 120,
    description:
      'YYYY-MM must not be after the current month. Other text is unchanged.',
  })
  @IsString()
  @MaxLength(120)
  @IsYearMonthNotAfterCurrentLocal()
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

  @ApiProperty({
    format: 'date',
    description: 'Must not be after today',
  })
  @IsDateString({ strict: true })
  @IsNotAfterLocalToday()
  invoiceDate!: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
