import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { IsDecimalMoneyAmount } from '../../../common/decorators/is-decimal-money-amount.decorator';
import {
  ASSET_REGISTER_COMPLIANCE_POLICY_NUMBER_MAX_LENGTH,
  ASSET_REGISTER_COMPLIANCE_REGISTRATION_REFERENCE_MAX_LENGTH,
} from '../constants/asset-register-vehicle.constants';

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

  @ApiProperty({
    format: 'date',
    description:
      'Must not be before today, and must not be before the current expiry (or the credential start when there is no expiry)',
  })
  @IsDateString({ strict: true })
  endDate!: string;

  @ApiPropertyOptional({
    description: 'Required when type is insurance.',
  })
  @IsOptional()
  @IsDecimalMoneyAmount()
  insurancePremium?: number;

  @ApiPropertyOptional({
    maxLength: ASSET_REGISTER_COMPLIANCE_POLICY_NUMBER_MAX_LENGTH,
    description: 'Persisted when type is insurance.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(ASSET_REGISTER_COMPLIANCE_POLICY_NUMBER_MAX_LENGTH)
  policyNumber?: string;

  @ApiPropertyOptional({
    maxLength: ASSET_REGISTER_COMPLIANCE_REGISTRATION_REFERENCE_MAX_LENGTH,
    description: 'Persisted when type is registration.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(ASSET_REGISTER_COMPLIANCE_REGISTRATION_REFERENCE_MAX_LENGTH)
  registrationReference?: string;
}
