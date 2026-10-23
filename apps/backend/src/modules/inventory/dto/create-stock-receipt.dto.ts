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
import {
  IsIsoDateOnOrAfterProperty,
  IsNotAfterLocalToday,
} from '../../../common/decorators/local-calendar-date-bounds.decorator';
import {
  INVENTORY_STOCK_RECEIPT_BATCH_LOT_REF_MAX,
  INVENTORY_STOCK_RECEIPT_NOTES_MAX,
  INVENTORY_STOCK_RECEIPT_PURCHASE_INVOICE_REF_MAX,
  INVENTORY_STOCK_RECEIPT_QUANTITY_RECEIVED_MAX,
  INVENTORY_STOCK_RECEIPT_QUANTITY_RECEIVED_MIN,
} from '../constants/inventory-field.constants';

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
  @MaxLength(INVENTORY_STOCK_RECEIPT_PURCHASE_INVOICE_REF_MAX)
  purchaseInvoiceReference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  financeInvoiceId?: string;

  @ApiProperty({
    format: 'date',
    description: 'Must not be after today',
  })
  @IsDateString({ strict: true })
  @IsNotAfterLocalToday()
  purchaseDate!: string;

  @ApiPropertyOptional({
    format: 'date',
    description: 'Must be on or after purchaseDate',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  @IsIsoDateOnOrAfterProperty('purchaseDate')
  expiryDate?: string;

  @ApiProperty()
  @IsInt()
  @Min(INVENTORY_STOCK_RECEIPT_QUANTITY_RECEIVED_MIN)
  @Max(INVENTORY_STOCK_RECEIPT_QUANTITY_RECEIVED_MAX)
  quantityReceived!: number;

  @ApiProperty({ description: 'Unit cost in minor currency units (paise)' })
  @IsInt()
  @Min(0)
  quantityUnitCostMinor!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(INVENTORY_STOCK_RECEIPT_BATCH_LOT_REF_MAX)
  batchLotReference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(INVENTORY_STOCK_RECEIPT_NOTES_MAX)
  notes?: string;
}
