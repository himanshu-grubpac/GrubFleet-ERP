import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsValidPhone } from '../../../common/decorators/is-valid-phone.decorator';

const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contract'] as const;

export class UpdateEmployeeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  designation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  department?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  branchLocationLabel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  locationId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  reportsToEmployeeId?: string | null;

  @ApiPropertyOptional({ enum: EMPLOYMENT_TYPES })
  @IsOptional()
  @IsIn(EMPLOYMENT_TYPES)
  employmentType?: (typeof EMPLOYMENT_TYPES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString({ strict: true })
  @MaxLength(10)
  dateOfJoining?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  @IsValidPhone()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isWorkshopTechnician?: boolean;
}
