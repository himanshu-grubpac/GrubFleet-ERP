import {
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  type FleetReturnInspectionAttribution,
  type FleetReturnInspectionItemRating,
  type FleetReturnInspectionSectionId,
} from '../constants/fleet-return-inspection-sections.constants';

const RATINGS: FleetReturnInspectionItemRating[] = [
  'unchecked',
  'pass',
  'minor',
  'major',
];

const ATTRIBUTIONS: FleetReturnInspectionAttribution[] = [
  'client_damage',
  'wear_tear',
  'pre_existing',
  'missing',
];

export class FleetReturnInspectionLineItemDto {
  @IsIn(RATINGS)
  rating!: FleetReturnInspectionItemRating;

  @IsOptional()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsIn(ATTRIBUTIONS)
  attribution?: FleetReturnInspectionAttribution;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999_999_999)
  repairCostMinor?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  photoCount?: number;
}

export class SaveReturnInspectionDto {
  @IsInt()
  @Min(0)
  @Max(9)
  currentSectionIndex!: number;

  @IsObject()
  sections!: Partial<
    Record<
      FleetReturnInspectionSectionId,
      Record<string, FleetReturnInspectionLineItemDto>
    >
  >;

  /** When true, validates full worksheet and marks ready_to_finalize (Screen 4b). */
  @IsOptional()
  @IsBoolean()
  complete?: boolean;
}
