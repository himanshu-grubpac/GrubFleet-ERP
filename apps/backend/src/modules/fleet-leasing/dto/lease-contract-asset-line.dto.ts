import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  LEASE_CONTRACT_MONEY_PATTERN,
  LEASE_CONTRACT_MONEY_PATTERN_MESSAGE,
} from '../constants/lease-contract-money.constants';

export class LeaseContractAssetLineDto {
  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description:
      'Stable asset register class id (preferred). When set, assetClass may be omitted or must match.',
  })
  @IsOptional()
  @IsUUID()
  assetClassId?: string;

  @ApiPropertyOptional({
    example: '2026_activa_150_petrol_efi_bl',
    description:
      'Denormalized generated class name — legacy wizard field; resolved to assetClassId on write.',
  })
  @ValidateIf((dto: LeaseContractAssetLineDto) => !dto.assetClassId?.trim())
  @IsString()
  @MaxLength(64)
  assetClass?: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  committedQuantity!: number;

  @ApiProperty({ example: '34500.00' })
  @IsString()
  @Matches(LEASE_CONTRACT_MONEY_PATTERN, {
    message: LEASE_CONTRACT_MONEY_PATTERN_MESSAGE,
  })
  ratePerVehicleMonth!: string;
}
