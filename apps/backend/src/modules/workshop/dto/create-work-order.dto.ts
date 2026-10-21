import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  WORKSHOP_ISSUE_DESCRIPTION_MAX,
  WORKSHOP_LABOR_LINE_MAX,
  WORKSHOP_NOTES_MAX,
  WORKSHOP_PART_LINE_MAX,
  WORKSHOP_REPORTED_BY_MAX,
} from '../constants/workshop-field.constants';
import { WorkOrderLaborLineDto } from './work-order-labor-line.dto';
import { WorkOrderPartLineDto } from './work-order-part-line.dto';

export class CreateWorkOrderDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;

  @ApiProperty({ description: 'Asset register fleet vehicle id' })
  @IsUUID()
  vehicleId!: string;

  @ApiPropertyOptional({
    description:
      'Labor job card template; copies template parts and labor charge',
  })
  @IsOptional()
  @IsUUID()
  laborJobCardId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  technicianEmployeeId?: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString({ strict: true })
  expectedCompletionDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(WORKSHOP_REPORTED_BY_MAX)
  reportedBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  odometerReading?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(WORKSHOP_ISSUE_DESCRIPTION_MAX)
  issueDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(WORKSHOP_NOTES_MAX)
  notes?: string;

  @ApiPropertyOptional({ type: [WorkOrderPartLineDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(WORKSHOP_PART_LINE_MAX)
  @ValidateNested({ each: true })
  @Type(() => WorkOrderPartLineDto)
  additionalParts?: WorkOrderPartLineDto[];

  @ApiPropertyOptional({ type: [WorkOrderLaborLineDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(WORKSHOP_LABOR_LINE_MAX)
  @ValidateNested({ each: true })
  @Type(() => WorkOrderLaborLineDto)
  additionalLabor?: WorkOrderLaborLineDto[];
}
