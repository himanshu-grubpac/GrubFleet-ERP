import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class GetFleetReturnDetailQueryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  organizationId!: string;

  @ApiPropertyOptional({
    description:
      'Gate-in preview — odometer reading for excess-km context banner',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  previewOdometer?: number;

  @ApiPropertyOptional({
    enum: ['looks_fine', 'visible_damage'],
    description: 'Gate-in preview — condition at glance for damage banner',
  })
  @IsOptional()
  @IsEnum(['looks_fine', 'visible_damage'])
  previewConditionAtGlance?: 'looks_fine' | 'visible_damage';
}
