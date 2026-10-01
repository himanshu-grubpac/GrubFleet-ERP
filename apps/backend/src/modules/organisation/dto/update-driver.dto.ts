import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsIso31661Alpha2Country } from '../../../common/decorators/is-iso31661-alpha2.decorator';
import { ORGANISATION_DRIVER_FIELD_LIMITS as L } from '../constants/driver-field.constants';

export class UpdateDriverDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(L.name)
  name?: string;

  @ApiPropertyOptional({ maxLength: L.cprNo })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(L.cprNo)
  cprNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(L.phone)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(L.email)
  email?: string;

  @ApiPropertyOptional({ maxLength: L.licenseNumber })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(L.licenseNumber)
  licenseNumber?: string;

  @ApiPropertyOptional({
    description: 'ISO 8601 calendar date (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'licenseExpiry must be an ISO date (YYYY-MM-DD)',
  })
  licenseExpiry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(L.addressLine)
  addressLine1?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(L.addressLine)
  addressLine2?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(L.addressRegion)
  addressCity?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(L.addressCountry, L.addressCountry)
  @Matches(/^[A-Za-z]{2}$/, {
    message: 'addressCountry must be a 2-letter ISO code',
  })
  @IsIso31661Alpha2Country()
  addressCountry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(L.addressRegion)
  addressState?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(L.addressRegion)
  addressDistrict?: string;

  @ApiPropertyOptional({ maxLength: L.addressPincode })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(L.addressPincode)
  addressPincode?: string;
}
