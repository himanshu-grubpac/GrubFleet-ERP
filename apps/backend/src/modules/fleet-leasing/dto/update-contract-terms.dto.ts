import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateContractTermsDto {
  @ApiProperty({ example: '2026-09-15' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: 24, description: 'Contract duration in months' })
  @IsInt()
  @Min(1)
  termMonths!: number;

  @ApiProperty({ example: '96000.00', description: 'Whole-contract security deposit' })
  @IsString()
  securityDeposit!: string;

  @ApiProperty({ enum: ['monthly', 'quarterly', 'annual'] })
  @IsEnum(['monthly', 'quarterly', 'annual'])
  billingFrequency!: 'monthly' | 'quarterly' | 'annual';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  additionalTerms?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  amcTier?: string;
}
