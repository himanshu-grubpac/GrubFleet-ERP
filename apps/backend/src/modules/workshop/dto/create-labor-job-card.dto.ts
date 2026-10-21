import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  WORKSHOP_LABOR_JOB_CARD_DESCRIPTION_MAX,
  WORKSHOP_LABOR_JOB_CARD_NAME_MAX,
  WORKSHOP_PART_LINE_MAX,
} from '../constants/workshop-field.constants';
import { LaborJobCardPartLineDto } from './labor-job-card-part-line.dto';

export class CreateLaborJobCardDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(WORKSHOP_LABOR_JOB_CARD_NAME_MAX)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(WORKSHOP_LABOR_JOB_CARD_DESCRIPTION_MAX)
  description?: string;

  @ApiProperty({
    description: 'Labor charge in minor currency units (paise for INR)',
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  laborChargeMinor!: number;

  @ApiPropertyOptional({ type: [LaborJobCardPartLineDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(WORKSHOP_PART_LINE_MAX)
  @ValidateNested({ each: true })
  @Type(() => LaborJobCardPartLineDto)
  parts?: LaborJobCardPartLineDto[];
}
