import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

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
  @IsDateString()
  startDate!: string;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({
    description: 'Required when type is insurance.',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  insurancePremium?: number;
}
