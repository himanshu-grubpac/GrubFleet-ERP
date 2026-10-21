import { ApiPropertyOptional } from '@nestjs/swagger';
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
  ValidateIf,
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

export class UpdateWorkOrderDto {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsUUID()
  technicianEmployeeId?: string | null;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString({ strict: true })
  expectedCompletionDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(WORKSHOP_REPORTED_BY_MAX)
  reportedBy?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  odometerReading?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(WORKSHOP_ISSUE_DESCRIPTION_MAX)
  issueDescription?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(WORKSHOP_NOTES_MAX)
  notes?: string | null;

  @ApiPropertyOptional({
    description:
      'Append additional part lines (does not replace existing lines)',
    type: [WorkOrderPartLineDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(WORKSHOP_PART_LINE_MAX)
  @ValidateNested({ each: true })
  @Type(() => WorkOrderPartLineDto)
  additionalParts?: WorkOrderPartLineDto[];

  @ApiPropertyOptional({
    description:
      'Append additional labor lines (does not replace existing lines)',
    type: [WorkOrderLaborLineDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(WORKSHOP_LABOR_LINE_MAX)
  @ValidateNested({ each: true })
  @Type(() => WorkOrderLaborLineDto)
  additionalLabor?: WorkOrderLaborLineDto[];
}
