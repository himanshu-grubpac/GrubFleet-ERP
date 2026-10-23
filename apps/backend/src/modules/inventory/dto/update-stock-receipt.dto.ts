import { ApiPropertyOptional } from '@nestjs/swagger';
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

export class UpdateStockReceiptDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  supplierId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(INVENTORY_STOCK_RECEIPT_PURCHASE_INVOICE_REF_MAX)
  purchaseInvoiceReference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  financeInvoiceId?: string | null;

  @ApiPropertyOptional({
    format: 'date',
    description: 'Must not be after today',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  @IsNotAfterLocalToday()
  purchaseDate?: string;

  @ApiPropertyOptional({
    format: 'date',
    description: 'Must be on or after purchaseDate when both are sent',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  @IsIsoDateOnOrAfterProperty('purchaseDate')
  expiryDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(INVENTORY_STOCK_RECEIPT_QUANTITY_RECEIVED_MIN)
  @Max(INVENTORY_STOCK_RECEIPT_QUANTITY_RECEIVED_MAX)
  quantityReceived?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  quantityUnitCostMinor?: number;

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
