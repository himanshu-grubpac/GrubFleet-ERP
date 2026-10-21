import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
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

export class CreateSaleInvoiceDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;

  @ApiProperty()
  @IsUUID()
  vehicleId!: string;

  @ApiProperty({ maxLength: 255 })
  @IsString()
  @MaxLength(255)
  buyerName!: string;

  @ApiPropertyOptional({ maxLength: 320 })
  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  buyerEmail?: string;

  @ApiProperty({
    description: 'Sale amount in minor currency units (paise for INR)',
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  totalAmountMinor!: number;

  @ApiProperty({ format: 'date' })
  @IsDateString({ strict: true })
  invoiceDate!: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({
    description:
      'When true, records intent to email buyer; outbound mail is not wired yet (audit only).',
  })
  @IsOptional()
  @IsBoolean()
  requestAutoEmail?: boolean;
}
