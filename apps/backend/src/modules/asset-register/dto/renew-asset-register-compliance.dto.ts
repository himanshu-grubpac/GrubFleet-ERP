import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { IsDecimalMoneyAmount } from '../../../common/decorators/is-decimal-money-amount.decorator';

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
  @IsDecimalMoneyAmount()
  insurancePremium?: number;
}
