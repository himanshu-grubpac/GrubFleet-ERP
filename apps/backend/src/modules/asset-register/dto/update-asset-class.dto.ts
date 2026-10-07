import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  ASSET_CLASS_DEFAULT_INTAKE_MAX_LENGTH,
  ASSET_CLASS_DESCRIPTION_MAX_LENGTH,
  ASSET_CLASS_FUEL_TYPE_MAX_LENGTH,
  ASSET_CLASS_MILEAGE_UNIT_MAX_LENGTH,
  ASSET_CLASS_NAME_MAX_LENGTH,
  ASSET_REGISTER_VEHICLE_TYPES,
} from '../constants/asset-class.constants';

export class UpdateAssetClassDto {
  @ApiPropertyOptional({ maxLength: ASSET_CLASS_NAME_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(ASSET_CLASS_NAME_MAX_LENGTH)
  name?: string;

  @ApiPropertyOptional({ maxLength: ASSET_CLASS_DESCRIPTION_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(ASSET_CLASS_DESCRIPTION_MAX_LENGTH)
  description?: string;

  @ApiPropertyOptional({ enum: ASSET_REGISTER_VEHICLE_TYPES })
  @IsOptional()
  @IsIn([...ASSET_REGISTER_VEHICLE_TYPES])
  vehicleType?: (typeof ASSET_REGISTER_VEHICLE_TYPES)[number];

  @ApiPropertyOptional({ maxLength: ASSET_CLASS_FUEL_TYPE_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(ASSET_CLASS_FUEL_TYPE_MAX_LENGTH)
  fuelType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  mileageFrom?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  mileageTo?: number;

  @ApiPropertyOptional({ maxLength: ASSET_CLASS_MILEAGE_UNIT_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(ASSET_CLASS_MILEAGE_UNIT_MAX_LENGTH)
  mileageUnit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  fuelTankCapacity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999999999.99)
  ratedLoadFrom?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999999999.99)
  ratedLoadTo?: number;

  @ApiPropertyOptional({ maxLength: ASSET_CLASS_DEFAULT_INTAKE_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(ASSET_CLASS_DEFAULT_INTAKE_MAX_LENGTH)
  defaultIntakeChecklist?: string;
}
