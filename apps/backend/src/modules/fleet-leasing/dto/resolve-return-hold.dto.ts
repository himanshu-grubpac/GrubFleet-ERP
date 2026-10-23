import { IsOptional, MaxLength } from 'class-validator';

/** Optional note when clearing return hold (audit metadata only). */
export class ResolveReturnHoldDto {
  @IsOptional()
  @MaxLength(500)
  resolutionNote?: string;
}
