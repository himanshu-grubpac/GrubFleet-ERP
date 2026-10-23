import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  INVENTORY_COMPATIBLE_ASSET_CLASS_LABEL_MAX,
  INVENTORY_COMPATIBLE_ASSET_CLASSES_MAX_ITEMS,
  INVENTORY_SPARE_PART_BRAND_MAX,
  INVENTORY_SPARE_PART_NAME_MAX,
} from '../constants/inventory-field.constants';
import { INVENTORY_UNIT_OF_MEASURE_VALUES } from '../constants/unit-of-measure.constants';

export class CreateSparePartDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(INVENTORY_SPARE_PART_NAME_MAX)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(INVENTORY_SPARE_PART_BRAND_MAX)
  brand?: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(INVENTORY_COMPATIBLE_ASSET_CLASSES_MAX_ITEMS)
  @IsString({ each: true })
  @MaxLength(INVENTORY_COMPATIBLE_ASSET_CLASS_LABEL_MAX, { each: true })
  compatibleAssetClasses!: string[];

  @ApiProperty({ enum: [...INVENTORY_UNIT_OF_MEASURE_VALUES] })
  @IsIn([...INVENTORY_UNIT_OF_MEASURE_VALUES])
  unitOfMeasure!: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(999999)
  retailMarkupPercent!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(999999)
  wholesaleMarkupPercent!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(9999999)
  reorderThreshold!: number;
}
