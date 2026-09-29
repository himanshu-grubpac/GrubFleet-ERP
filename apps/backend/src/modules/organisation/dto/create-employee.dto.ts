import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  IsDateString,
} from 'class-validator';

const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contract'] as const;

export class CreateEmployeeDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fullName!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  designation!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  department!: string;

  @ApiPropertyOptional({
    description: 'Branch label when not linked to a location record',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  branchLocationLabel?: string;

  @ApiProperty({ description: 'Office location UUID in the organisation' })
  @IsUUID()
  locationId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  reportsToEmployeeId?: string;

  @ApiProperty({ enum: EMPLOYMENT_TYPES })
  @IsIn(EMPLOYMENT_TYPES)
  employmentType!: (typeof EMPLOYMENT_TYPES)[number];

  @ApiProperty({ description: 'ISO date YYYY-MM-DD' })
  @IsDateString({ strict: true })
  @MaxLength(10)
  dateOfJoining!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  phone!: string;

  @ApiProperty()
  @IsEmail()
  @MaxLength(320)
  email!: string;
}
