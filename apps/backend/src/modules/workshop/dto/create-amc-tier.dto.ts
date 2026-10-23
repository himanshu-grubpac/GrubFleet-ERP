import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  WORKSHOP_AMC_TIER_DESCRIPTION_MAX,
  WORKSHOP_AMC_TIER_NAME_MAX,
} from '../constants/workshop-field.constants';

export class CreateAmcTierDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(WORKSHOP_AMC_TIER_NAME_MAX)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(WORKSHOP_AMC_TIER_DESCRIPTION_MAX)
  description?: string;

  @ApiPropertyOptional({
    description: 'Annual price in minor currency units (paise for INR)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  pricePaise?: number;
}
