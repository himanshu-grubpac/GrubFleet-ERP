import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsIso31661Alpha2Country } from '../../../common/decorators/is-iso31661-alpha2.decorator';
import { IsValidGstin } from '../../../common/decorators/is-valid-gstin.decorator';
import { IsValidPostalForCountry } from '../../../common/decorators/is-valid-postal-for-country.decorator';
import { ClientPocDto } from './client-poc.dto';

export class CreateFleetClientDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  companyName!: string;

  @ApiPropertyOptional({ description: 'GSTIN / Tax ID' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  @IsValidGstin()
  taxId?: string;

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
  @IsValidPostalForCountry('addressCountry')
  addressPincode!: string;

  @ApiProperty({ type: [ClientPocDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ClientPocDto)
  pointsOfContact!: ClientPocDto[];
}
