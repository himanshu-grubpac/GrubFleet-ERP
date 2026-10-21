import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsIsoCalendarDate } from '../../../common/decorators/is-iso-calendar-date.decorator';
import { IsValidPhone } from '../../../common/decorators/is-valid-phone.decorator';

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

  @ApiProperty({ description: 'ISO 8601 calendar date (YYYY-MM-DD)' })
  @IsNotEmpty()
  @IsIsoCalendarDate({ allowFuture: false })
  @MaxLength(10)
  dateOfJoining!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  @IsValidPhone()
  phone!: string;

  @ApiProperty()
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiPropertyOptional({
    description:
      'When true, employee appears in workshop technician pickers and can be assigned to work orders',
  })
  @IsOptional()
  @IsBoolean()
  isWorkshopTechnician?: boolean;
}
