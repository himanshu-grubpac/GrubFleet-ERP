import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export const MODULE_ACCESS_LEVELS = ['NONE', 'VIEW', 'MANAGE', 'FULL'] as const;
export type ModuleAccessLevelDto = (typeof MODULE_ACCESS_LEVELS)[number];

export class ModuleAccessEntryDto {
  @ApiProperty({ example: 'fleet_leasing' })
  @IsString()
  moduleId!: string;

  @ApiProperty({ enum: MODULE_ACCESS_LEVELS })
  @IsIn(MODULE_ACCESS_LEVELS)
  accessLevel!: ModuleAccessLevelDto;
}
