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
import { INVENTORY_UNIT_OF_MEASURE_VALUES } from '../constants/unit-of-measure.constants';

export class CreateSparePartDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  brand?: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(32)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
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
