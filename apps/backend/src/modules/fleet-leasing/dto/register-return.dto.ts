import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsObject, IsOptional, IsUUID, Min } from 'class-validator';

export class RegisterReturnDto {
  @ApiProperty()
  @IsUUID()
  vehicleId!: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  odometerReading!: number;

  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  conditionChecklist!: Record<string, 'pass' | 'fail'>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  damageRecordId?: string;
}
