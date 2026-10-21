import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PasswordFlowSuccessDto {
  @ApiProperty({ enum: [true] })
  success!: true;
}

export class ForgotPasswordResponseDto {
  @ApiProperty({
    description:
      'Generic message; same whether or not the email is registered (no user enumeration).',
  })
  message!: string;

  @ApiPropertyOptional({
    description:
      'Present only when PASSWORD_RESET_EXPOSE_TOKEN_FOR_TESTS=1 (integration tests). Never in production.',
  })
  resetToken?: string;
}
