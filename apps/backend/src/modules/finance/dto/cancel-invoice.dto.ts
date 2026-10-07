import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, MaxLength } from 'class-validator';

export class CancelInvoiceDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;

  @ApiPropertyOptional({
    maxLength: 500,
    description: 'Optional reason stored on the invoice for audit',
  })
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}
