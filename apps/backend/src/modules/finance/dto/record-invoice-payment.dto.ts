import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { FINANCE_INVOICE_PAYMENT_METHODS } from '../constants/payment-method.constants';

export class RecordInvoicePaymentDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;

  @ApiProperty({
    description: 'Payment amount in minor units; must not exceed balance due',
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  amountMinor!: number;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  paymentDate!: string;

  @ApiPropertyOptional({ enum: FINANCE_INVOICE_PAYMENT_METHODS })
  @IsOptional()
  @IsIn([...FINANCE_INVOICE_PAYMENT_METHODS])
  paymentMethod?: string;

  @ApiPropertyOptional({
    maxLength: 120,
    description: 'External reference (UTR, cheque no., etc.)',
  })
  @IsOptional()
  @MaxLength(120)
  paymentReference?: string;
}
