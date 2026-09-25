import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LeaseContractAssetLineDto } from './lease-contract-asset-line.dto';

export class UpdateLeaseContractDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  termMonths?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  securityDeposit?: string;

  @ApiPropertyOptional({ enum: ['monthly', 'quarterly', 'annual'] })
  @IsOptional()
  @IsEnum(['monthly', 'quarterly', 'annual'])
  billingFrequency?: 'monthly' | 'quarterly' | 'annual';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  additionalTerms?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  amcTier?: string;

  @ApiPropertyOptional({ type: [LeaseContractAssetLineDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LeaseContractAssetLineDto)
  assetLines?: LeaseContractAssetLineDto[];

  @ApiPropertyOptional({ type: [String], format: 'uuid' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  vehicleIds?: string[];
}
