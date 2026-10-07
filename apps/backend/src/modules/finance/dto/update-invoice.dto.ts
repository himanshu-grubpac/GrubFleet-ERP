import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateInvoiceDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
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

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString()
  invoiceDate?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @MaxLength(120)
  billingPeriod?: string;
}
