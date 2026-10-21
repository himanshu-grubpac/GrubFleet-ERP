import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import {
  LEASE_CONTRACT_MONEY_PATTERN,
  LEASE_CONTRACT_MONEY_PATTERN_MESSAGE,
} from '../constants/lease-contract-money.constants';
import { AMC_TIER_STUB_VALUES } from '../constants/amc-tier-stub';

export class UpdateContractTermsDto {
  @ApiProperty({ example: '2026-09-15' })
  @IsDateString({ strict: true })
  startDate!: string;

  @ApiProperty({ example: 24, description: 'Contract duration in months' })
  @IsInt()
  @Min(1)
  termMonths!: number;

  @ApiProperty({
    example: '96000.00',
    description: 'Whole-contract security deposit',
  })
  @IsString()
  @Matches(LEASE_CONTRACT_MONEY_PATTERN, {
    message: LEASE_CONTRACT_MONEY_PATTERN_MESSAGE,
  })
  securityDeposit!: string;

  @ApiProperty({ enum: ['monthly', 'quarterly', 'annual'] })
  @IsEnum(['monthly', 'quarterly', 'annual'])
  billingFrequency!: 'monthly' | 'quarterly' | 'annual';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  additionalTerms?: string;

  @ApiPropertyOptional({ enum: [...AMC_TIER_STUB_VALUES] })
  @IsOptional()
  @IsIn([...AMC_TIER_STUB_VALUES])
  amcTier?: string;
}
