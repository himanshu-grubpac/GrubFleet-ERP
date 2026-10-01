import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
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
import { IsIso31661Alpha2Country } from '../../../common/decorators/is-iso31661-alpha2.decorator';
import { OrganisationClientPocDto } from './client-poc.dto';

export class CreateOrganisationClientDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;

  @ApiProperty({ description: 'Client / company name' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  clientName!: string;

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

  @ApiProperty({ type: [OrganisationClientPocDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrganisationClientPocDto)
  pointsOfContact!: OrganisationClientPocDto[];
}
