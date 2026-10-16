import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class WorkOrderPartLineDto {
  @ApiProperty()
  @IsUUID()
  partId!: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({
    description:
      'Unit cost snapshot in minor units; when omitted, server uses latest receipt average when available',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  unitCostMinor?: number;
}
