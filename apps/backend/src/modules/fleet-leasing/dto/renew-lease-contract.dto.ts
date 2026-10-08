import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, Min } from 'class-validator';

export class RenewLeaseContractDto {
  @ApiProperty({ example: 24, description: 'New contract term in months' })
  @IsInt()
  @Min(1)
  newTermMonths!: number;

  @ApiProperty({
    example: '2027-01-12',
    description: 'New contract start date (ISO date)',
  })
  @IsDateString()
  newStartDate!: string;
}
