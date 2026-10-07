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

export class CreatePurchaseSparePartsInvoiceDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;

  @ApiProperty()
  @IsUUID()
  supplierId!: string;

  @ApiProperty()
  @IsUUID()
  inventoryPartId!: string;

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  quantity!: number;

  @ApiProperty({
    description: 'Unit cost in minor currency units (paise for INR)',
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  unitCostMinor!: number;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  invoiceDate!: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @MaxLength(120)
  batchLot?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}
