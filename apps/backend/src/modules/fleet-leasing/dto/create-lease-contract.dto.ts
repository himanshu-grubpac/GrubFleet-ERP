import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { emptyStringToUndefined } from '../../../common/transformers/empty-string-to-undefined.transform';
import { LeaseContractAssetLineDto } from './lease-contract-asset-line.dto';
import {
  LEASE_CONTRACT_MONEY_PATTERN,
  LEASE_CONTRACT_MONEY_PATTERN_MESSAGE,
} from '../constants/lease-contract-money.constants';
import { AMC_TIER_STUB_VALUES } from '../constants/amc-tier-stub';

export class CreateLeaseContractDto {
  @ApiPropertyOptional()
  @IsUUID()
  organizationId!: string;

  @ApiPropertyOptional()
  @Transform(emptyStringToUndefined)
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString({ strict: true })
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString({ strict: true })
  endDate?: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  termMonths?: number;

  @ApiPropertyOptional({ example: '96000.00' })
  @IsOptional()
  @IsString()
  @Matches(LEASE_CONTRACT_MONEY_PATTERN, {
    message: LEASE_CONTRACT_MONEY_PATTERN_MESSAGE,
  })
  securityDeposit?: string;

  @ApiPropertyOptional({ enum: ['monthly', 'quarterly', 'annual'] })
  @IsOptional()
  @IsEnum(['monthly', 'quarterly', 'annual'])
  billingFrequency?: 'monthly' | 'quarterly' | 'annual';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  additionalTerms?: string;

  @ApiPropertyOptional({ enum: [...AMC_TIER_STUB_VALUES] })
  @IsOptional()
  @IsIn([...AMC_TIER_STUB_VALUES])
  amcTier?: string;

  @ApiPropertyOptional({ description: 'Optional contract note or summary' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ type: [LeaseContractAssetLineDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LeaseContractAssetLineDto)
  assetLines?: LeaseContractAssetLineDto[];

  @ApiPropertyOptional({
    description:
      'When assetLines include a shortfall, set true to save lines as awaiting assets (same as PUT asset-lines confirmShortfall)',
  })
  @IsOptional()
  @IsBoolean()
  confirmShortfall?: boolean;

  @ApiPropertyOptional({ type: [String], format: 'uuid' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  vehicleIds?: string[];
}
