import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { FLEET_RETURN_INSPECTION_SECTION_IDS } from '../constants/fleet-return-inspection-sections.constants';

const RE_INSPECTION_RATINGS = ['pass', 'minor', 'major'] as const;
const RE_INSPECTION_OUTCOMES = ['ready_to_lease', 'back_to_workshop'] as const;

export class ReInspectionPoolChecklistDto {
  @IsBoolean()
  roadTestDone!: boolean;

  @IsBoolean()
  washedCleaned!: boolean;

  @IsBoolean()
  fuelLevelChecked!: boolean;

  @IsBoolean()
  insuranceValidAck!: boolean;

  @IsBoolean()
  pucValidAck!: boolean;
}

export class ReInspectionItemDto {
  @IsString()
  @MaxLength(128)
  itemKey!: string;

  @IsIn(FLEET_RETURN_INSPECTION_SECTION_IDS)
  sectionId!: (typeof FLEET_RETURN_INSPECTION_SECTION_IDS)[number];

  @IsIn(RE_INSPECTION_RATINGS)
  rating!: (typeof RE_INSPECTION_RATINGS)[number];
}

export class SaveReInspectionDto {
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => ReInspectionItemDto)
  items!: ReInspectionItemDto[];

  @ValidateNested()
  @Type(() => ReInspectionPoolChecklistDto)
  poolChecklist!: ReInspectionPoolChecklistDto;

  @IsInt()
  @Min(1)
  odometerAfterRoadTest!: number;

  @IsOptional()
  @IsIn(RE_INSPECTION_OUTCOMES)
  selectedOutcome?: (typeof RE_INSPECTION_OUTCOMES)[number];

  @IsOptional()
  @IsInt()
  @Min(0)
  workshopActualCostMinor?: number;

  @IsOptional()
  @IsBoolean()
  complete?: boolean;
}
