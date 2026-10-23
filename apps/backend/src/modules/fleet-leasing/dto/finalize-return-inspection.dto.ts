import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  FLEET_RETURN_INSPECTION_DISPOSITIONS,
  FLEET_RETURN_WORKSHOP_PRIORITIES,
  type FleetReturnInspectionDisposition,
  type FleetReturnWorkshopPriority,
} from '../constants/fleet-return-inspection-finalize.constants';
import {
  FLEET_RETURN_INSPECTION_SECTION_IDS,
  type FleetReturnInspectionSectionId,
} from '../constants/fleet-return-inspection-sections.constants';

export class FinalizeReturnInspectionIssueChargeDto {
  @IsIn(FLEET_RETURN_INSPECTION_SECTION_IDS)
  sectionId!: FleetReturnInspectionSectionId;

  @IsString()
  @MaxLength(64)
  itemKey!: string;

  @IsBoolean()
  chargeClient!: boolean;
}

export class FinalizeReturnInspectionDto {
  @IsOptional()
  @IsIn(FLEET_RETURN_INSPECTION_DISPOSITIONS)
  disposition?: FleetReturnInspectionDisposition;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => FinalizeReturnInspectionIssueChargeDto)
  issueCharges?: FinalizeReturnInspectionIssueChargeDto[];

  @IsOptional()
  @IsBoolean()
  waiveAllRecovery?: boolean;

  @IsOptional()
  @IsBoolean()
  inspectorConfirmed?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  wearAndTearNote?: string;

  @IsOptional()
  @IsIn(FLEET_RETURN_WORKSHOP_PRIORITIES)
  workshopPriority?: FleetReturnWorkshopPriority;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  workshopTargetDate?: string;

  /** When true, validates and completes inspection (Screen 4b → Screen 5). */
  @IsOptional()
  @IsBoolean()
  complete?: boolean;
}
