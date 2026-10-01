import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsIso31661Alpha2Country } from '../../../common/decorators/is-iso31661-alpha2.decorator';
import { ORGANISATION_SUPPLIER_TYPES } from '../constants/supplier-type.constants';

export class CreateSupplierDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @ApiProperty({ enum: ORGANISATION_SUPPLIER_TYPES })
  @IsIn(ORGANISATION_SUPPLIER_TYPES)
  supplierType!: (typeof ORGANISATION_SUPPLIER_TYPES)[number];

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  contactPerson!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  contactPhone!: string;

  @ApiProperty()
  @IsEmail()
  @MaxLength(320)
  contactEmail!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  agreementReference?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  addressLine1!: string;

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

  @ApiProperty({
    description: 'ISO 3166-1 alpha-2 country code',
    example: 'IN',
    minLength: 2,
    maxLength: 2,
  })
  @IsString()
  @Length(2, 2)
  @Matches(/^[A-Za-z]{2}$/, {
    message: 'addressCountry must be a 2-letter ISO code',
  })
  @IsIso31661Alpha2Country()
  addressCountry!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  addressState!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  addressDistrict!: string;

  @ApiProperty({ maxLength: 20 })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  addressPincode!: string;
}
