import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class RoleEditorMatrixQueryDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;

  @ApiPropertyOptional({
    description: 'Role being edited; omit when creating a new role',
  })
  @IsOptional()
  @IsUUID()
  roleId?: string;
}
