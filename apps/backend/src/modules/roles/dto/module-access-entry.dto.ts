import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';
import { IsKnownErpModuleId } from '../../../common/decorators/is-known-erp-module-id.decorator';

export const MODULE_ACCESS_LEVELS = ['NONE', 'VIEW', 'MANAGE', 'FULL'] as const;
export type ModuleAccessLevelDto = (typeof MODULE_ACCESS_LEVELS)[number];

export class ModuleAccessEntryDto {
  @ApiProperty({ example: 'fleet_leasing' })
  @IsString()
  @IsKnownErpModuleId()
  moduleId!: string;

  @ApiProperty({ enum: MODULE_ACCESS_LEVELS })
  @IsIn(MODULE_ACCESS_LEVELS)
  accessLevel!: ModuleAccessLevelDto;
}
