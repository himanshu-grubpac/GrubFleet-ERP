import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class CreateAmcSubscriberDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;

  @ApiProperty()
  @IsUUID()
  amcTierId!: string;

  @ApiProperty()
  @IsUUID()
  vehicleId!: string;

  @ApiPropertyOptional({ description: 'ISO date when subscription started' })
  @IsOptional()
  @IsDateString()
  startedAt?: string;
}
