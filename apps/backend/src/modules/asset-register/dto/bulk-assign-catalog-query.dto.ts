import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class BulkAssignCatalogQueryDto {
  @ApiPropertyOptional()
  @IsUUID()
  organizationId!: string;

  @ApiPropertyOptional({
    description:
      'When set, response includes active contracts and asset lines for this organisation client',
  })
  @IsOptional()
  @IsUUID()
  organisationClientId?: string;
}
