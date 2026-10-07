import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class CreateStockReceiptDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;

  @ApiProperty()
  @IsUUID()
  partId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiProperty()
  @IsUUID()
  locationId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  purchaseInvoiceReference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  financeInvoiceId?: string;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  purchaseDate!: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(9999999)
  quantityReceived!: number;

  @ApiProperty({ description: 'Unit cost in minor currency units (paise)' })
  @IsInt()
  @Min(0)
  quantityUnitCostMinor!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  batchLotReference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
