import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
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

export class UpdateInvoiceDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  partyName?: string;

  @ApiPropertyOptional({ maxLength: 320 })
  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  partyEmail?: string;

  @ApiPropertyOptional({
    description: 'Total amount in minor units (unpaid invoices only)',
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  totalAmountMinor?: number;

  @ApiPropertyOptional({
    format: 'date',
    description: 'Must not be after today',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  @IsNotAfterLocalToday()
  invoiceDate?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({
    maxLength: 120,
    description:
      'YYYY-MM must not be after the current month. Other text is unchanged.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @IsYearMonthNotAfterCurrentLocal()
  billingPeriod?: string;
}
