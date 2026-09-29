import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateLocationTypeDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;

  @ApiProperty({ example: 'Head office' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;
}
