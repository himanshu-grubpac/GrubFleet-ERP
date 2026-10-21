import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';
import {
  DECIMAL_MONEY_PATTERN,
  DECIMAL_MONEY_PATTERN_MESSAGE,
} from '@grubpac/validation';

export enum AssetRegisterComplianceRenewType {
  INSURANCE = 'insurance',
  REGISTRATION = 'registration',
  WARRANTY = 'warranty',
}

export class RenewAssetRegisterComplianceDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;

  @ApiProperty({ enum: AssetRegisterComplianceRenewType })
  @IsEnum(AssetRegisterComplianceRenewType)
  type!: AssetRegisterComplianceRenewType;

  @ApiProperty({ format: 'date' })
  @IsDateString({ strict: true })
  startDate!: string;

  @ApiProperty({ format: 'date' })
  @IsDateString({ strict: true })
  endDate!: string;

  @ApiPropertyOptional({
    description: 'Required when type is insurance.',
  })
  @IsOptional()
  @IsString()
  @Matches(DECIMAL_MONEY_PATTERN, { message: DECIMAL_MONEY_PATTERN_MESSAGE })
  insurancePremium?: string;
}
