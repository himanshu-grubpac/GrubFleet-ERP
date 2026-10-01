import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class CreateDriverDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(L.name)
  name!: string;

  @ApiProperty({ maxLength: L.cprNo })
  @IsString()
  @MinLength(1)
  @MaxLength(L.cprNo)
  cprNo!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(L.phone)
  phone!: string;

  @ApiProperty()
  @IsEmail()
  @MaxLength(L.email)
  email!: string;

  @ApiProperty({ maxLength: L.licenseNumber })
  @IsString()
  @MinLength(1)
  @MaxLength(L.licenseNumber)
  licenseNumber!: string;

  @ApiProperty({
    description: 'ISO 8601 calendar date (YYYY-MM-DD)',
    example: '2027-04-18',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'licenseExpiry must be an ISO date (YYYY-MM-DD)',
  })
  licenseExpiry!: string;

  @ApiProperty({ description: 'Organisation supplier (driver staffing type)' })
  @IsUUID()
  supplierId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(L.addressLine)
  addressLine1!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(L.addressLine)
  addressLine2?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(L.addressRegion)
  addressCity?: string;

  @ApiProperty({
    description: 'ISO 3166-1 alpha-2 country code',
    example: 'IN',
    minLength: L.addressCountry,
    maxLength: L.addressCountry,
  })
  @IsString()
  @Length(L.addressCountry, L.addressCountry)
  @Matches(/^[A-Za-z]{2}$/, {
    message: 'addressCountry must be a 2-letter ISO code',
  })
  @IsIso31661Alpha2Country()
  addressCountry!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(L.addressRegion)
  addressState!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(L.addressRegion)
  addressDistrict!: string;

  @ApiProperty({ maxLength: L.addressPincode })
  @IsString()
  @MinLength(1)
  @MaxLength(L.addressPincode)
  addressPincode!: string;
}
