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
import { IsValidPhone } from '../../../common/decorators/is-valid-phone.decorator';
import { IsValidPostalForCountry } from '../../../common/decorators/is-valid-postal-for-country.decorator';

export class UpdateLocationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  locationTypeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  addressLine1?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine2?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  addressCity?: string;

  @ApiPropertyOptional({
    description:
      'ISO 3166-1 alpha-2 country code (any valid code from maintained ISO dataset)',
    minLength: 2,
    maxLength: 2,
  })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  @Matches(/^[A-Za-z]{2}$/, {
    message: 'addressCountry must be a 2-letter ISO code',
  })
  @IsIso31661Alpha2Country()
  addressCountry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  addressState?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  addressDistrict?: string;

  @ApiPropertyOptional({
    description: 'Postal code — format validated per addressCountry',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @IsValidPostalForCountry('addressCountry')
  addressPincode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  @IsValidPhone()
  siteContactPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  siteContactEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  responsibleEmployeeId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  deputyEmployeeId?: string | null;
}
