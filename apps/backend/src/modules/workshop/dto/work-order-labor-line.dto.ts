import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { WORKSHOP_LABOR_LINE_DESCRIPTION_MAX } from '../constants/workshop-field.constants';

export class WorkOrderLaborLineDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(WORKSHOP_LABOR_LINE_DESCRIPTION_MAX)
  description!: string;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  amountMinor!: number;
}
