import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  ASSET_CLASS_BRAND_MAX_LENGTH,
  ASSET_CLASS_COLOR_CODE_MAX_LENGTH,
  ASSET_CLASS_COLOR_MAX_LENGTH,
  ASSET_CLASS_DEFAULT_INTAKE_MAX_LENGTH,
  ASSET_CLASS_DESCRIPTION_MAX_LENGTH,
  ASSET_CLASS_ENGINE_CC_MAX,
  ASSET_CLASS_ENGINE_CC_MIN,
  ASSET_CLASS_FUEL_SYSTEM_MAX_LENGTH,
  ASSET_CLASS_FUEL_TYPE_MAX_LENGTH,
  ASSET_CLASS_INTAKE_ITEM_MAX_LENGTH,
  ASSET_CLASS_INTAKE_ITEMS_MAX,
  ASSET_CLASS_MANUFACTURING_YEAR_MAX,
  ASSET_CLASS_MANUFACTURING_YEAR_MIN,
  ASSET_CLASS_MILEAGE_UNIT_MAX_LENGTH,
  ASSET_CLASS_MODEL_NAME_MAX_LENGTH,
  ASSET_REGISTER_VEHICLE_TYPES,
} from '../constants/asset-class.constants';

export class CreateAssetClassDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;

  @ApiPropertyOptional({ maxLength: ASSET_CLASS_BRAND_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(ASSET_CLASS_BRAND_MAX_LENGTH)
  brand?: string;

  @ApiPropertyOptional({ maxLength: ASSET_CLASS_MODEL_NAME_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(ASSET_CLASS_MODEL_NAME_MAX_LENGTH)
  modelName?: string;

  @ApiPropertyOptional({
    minimum: ASSET_CLASS_MANUFACTURING_YEAR_MIN,
    maximum: ASSET_CLASS_MANUFACTURING_YEAR_MAX,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(ASSET_CLASS_MANUFACTURING_YEAR_MIN)
  @Max(ASSET_CLASS_MANUFACTURING_YEAR_MAX)
  manufacturingYear?: number;

  @ApiPropertyOptional({
    minimum: ASSET_CLASS_ENGINE_CC_MIN,
    maximum: ASSET_CLASS_ENGINE_CC_MAX,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(ASSET_CLASS_ENGINE_CC_MIN)
  @Max(ASSET_CLASS_ENGINE_CC_MAX)
  engineDisplacementCc?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  fuelCapacity?: number;

  @ApiPropertyOptional({ maxLength: ASSET_CLASS_FUEL_SYSTEM_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(ASSET_CLASS_FUEL_SYSTEM_MAX_LENGTH)
  fuelSystem?: string;

  @ApiPropertyOptional({ maxLength: ASSET_CLASS_COLOR_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(ASSET_CLASS_COLOR_MAX_LENGTH)
  color?: string;

  @ApiPropertyOptional({ maxLength: ASSET_CLASS_COLOR_CODE_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(ASSET_CLASS_COLOR_CODE_MAX_LENGTH)
  colorCode?: string;

  @ApiPropertyOptional({ maxLength: ASSET_CLASS_DESCRIPTION_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(ASSET_CLASS_DESCRIPTION_MAX_LENGTH)
  description?: string;

  @ApiProperty({ enum: ASSET_REGISTER_VEHICLE_TYPES })
  @IsIn([...ASSET_REGISTER_VEHICLE_TYPES])
  vehicleType!: (typeof ASSET_REGISTER_VEHICLE_TYPES)[number];

  @ApiProperty({ maxLength: ASSET_CLASS_FUEL_TYPE_MAX_LENGTH })
  @IsString()
  @MinLength(1)
  @MaxLength(ASSET_CLASS_FUEL_TYPE_MAX_LENGTH)
  fuelType!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  mileageFrom!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  mileageTo!: number;

  @ApiProperty({ maxLength: ASSET_CLASS_MILEAGE_UNIT_MAX_LENGTH })
  @IsString()
  @MinLength(1)
  @MaxLength(ASSET_CLASS_MILEAGE_UNIT_MAX_LENGTH)
  mileageUnit!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  fuelTankCapacity!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999999999.99)
  ratedLoadFrom!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999999999.99)
  ratedLoadTo!: number;

  @ApiProperty({
    type: [String],
    maxItems: ASSET_CLASS_INTAKE_ITEMS_MAX,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(ASSET_CLASS_INTAKE_ITEMS_MAX)
  @IsString({ each: true })
  @MaxLength(ASSET_CLASS_INTAKE_ITEM_MAX_LENGTH, { each: true })
  intakeChecklistItems!: string[];

  /** @deprecated Prefer intakeChecklistItems — kept for backward-compatible clients. */
  @ApiPropertyOptional({ maxLength: ASSET_CLASS_DEFAULT_INTAKE_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(ASSET_CLASS_DEFAULT_INTAKE_MAX_LENGTH)
  defaultIntakeChecklist?: string;
}
