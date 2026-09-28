import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class GetRoleQueryDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;
}
