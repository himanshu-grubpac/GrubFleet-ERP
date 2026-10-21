import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  PORTAL_SEARCH_DEFAULT_LIMIT_PER_TYPE,
  PORTAL_SEARCH_MAX_LIMIT_PER_TYPE,
  PORTAL_SEARCH_MAX_QUERY_LENGTH,
  PORTAL_SEARCH_MIN_QUERY_LENGTH,
} from '../constants/portal-search.constants';

export class PortalSearchQueryDto {
  @ApiProperty({ description: 'Organization scope (must match caller membership)' })
  @IsUUID()
  organizationId!: string;

  @ApiProperty({
    description: 'Search text (trimmed; ILIKE across enabled modules)',
    minLength: PORTAL_SEARCH_MIN_QUERY_LENGTH,
    maxLength: PORTAL_SEARCH_MAX_QUERY_LENGTH,
  })
  @IsString()
  @MinLength(PORTAL_SEARCH_MIN_QUERY_LENGTH)
  @MaxLength(PORTAL_SEARCH_MAX_QUERY_LENGTH)
  q!: string;

  @ApiPropertyOptional({
    description: 'Max hits per entity type before global cap',
    minimum: 1,
    maximum: PORTAL_SEARCH_MAX_LIMIT_PER_TYPE,
    default: PORTAL_SEARCH_DEFAULT_LIMIT_PER_TYPE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PORTAL_SEARCH_MAX_LIMIT_PER_TYPE)
  limitPerType?: number;
}
