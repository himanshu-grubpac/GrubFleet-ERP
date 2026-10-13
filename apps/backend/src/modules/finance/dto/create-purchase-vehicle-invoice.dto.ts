import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export const FINANCE_PURCHASE_VEHICLE_TAX_MODES = [
  'INCLUSIVE',
  'EXCLUSIVE',
] as const;

export type FinancePurchaseVehicleTaxMode =
  (typeof FINANCE_PURCHASE_VEHICLE_TAX_MODES)[number];

export class CreatePurchaseVehicleInvoiceLineDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  assetClassId!: string;

  @ApiProperty({ minimum: 1, maximum: 1_000_000 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  quantity!: number;

  @ApiProperty({
    description: 'Per-unit rate in minor currency units (paise for INR)',
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  rateMinor!: number;

  @ApiProperty({ enum: FINANCE_PURCHASE_VEHICLE_TAX_MODES })
  @IsEnum(FINANCE_PURCHASE_VEHICLE_TAX_MODES)
  taxMode!: FinancePurchaseVehicleTaxMode;

  @ApiProperty({ minimum: 0, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  vatPercent!: number;
}

export class CreatePurchaseVehicleInvoiceDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;

  @ApiProperty()
  @IsUUID()
  supplierId!: string;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  invoiceDate!: string;

  @ApiProperty({
    type: [CreatePurchaseVehicleInvoiceLineDto],
    minItems: 1,
    maxItems: 50,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseVehicleInvoiceLineDto)
  lines!: CreatePurchaseVehicleInvoiceLineDto[];

  @ApiProperty({
    description:
      'Grand total in minor units — must equal sum of computed line totals',
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  grandTotalMinor!: number;
}
