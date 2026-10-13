import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class VehicleReplacementPairDto {
  @ApiProperty()
  @IsUUID()
  contractId!: string;

  @ApiProperty()
  @IsUUID()
  fromVehicleId!: string;

  @ApiProperty()
  @IsUUID()
  toVehicleId!: string;
}

export class CreateVehicleReplacementsDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;

  @ApiProperty({ type: [VehicleReplacementPairDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(25)
  @ValidateNested({ each: true })
  @Type(() => VehicleReplacementPairDto)
  replacements!: VehicleReplacementPairDto[];
}
