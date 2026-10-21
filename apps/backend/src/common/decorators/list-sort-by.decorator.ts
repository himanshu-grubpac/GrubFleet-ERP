import { applyDecorators } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

/** Whitelisted `sortBy` query param for paginated list DTOs. */
export function SortByQuery<T extends readonly string[]>(allowed: T) {
  return applyDecorators(
    ApiPropertyOptional({ enum: allowed }),
    IsOptional(),
    IsString(),
    IsIn(allowed),
  );
}
