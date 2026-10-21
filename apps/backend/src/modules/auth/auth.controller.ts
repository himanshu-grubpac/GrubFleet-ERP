import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { Env } from '../../config/env.schema';
import { AuthPasswordService } from './auth-password.service';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { MeResponseDto } from './dto/me-response.dto';
import { RefreshTokenDto } from './dto/refresh.dto';
import {
  ForgotPasswordResponseDto,
  PasswordFlowSuccessDto,
} from './dto/password-flow-response.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { TokenPairResponseDto } from './dto/token-response.dto';
import type { AuthenticatedUser } from './types/authenticated-user.type';
import { parseDurationToSeconds } from './utils/duration.util';
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authPasswordService: AuthPasswordService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Public()
  @Get('status')
  @ApiOperation({ summary: 'Auth module implementation status' })
  status(): { module: string; implemented: boolean; note: string } {
    return {
      module: 'auth',
      implemented: true,
      note: 'Login, refresh, logout, change-password, forgot-password, reset-password, JWT guards, and /auth/me are available.',
    };
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Email and password login' })
  login(
    @Body() dto: LoginDto,
    @Req() req: Request,
  ): Promise<TokenPairResponseDto> {
    const { accessTtlSec, refreshTtlSec } = this.tokenTtls();
    return this.authService.login(dto, req, accessTtlSec, refreshTtlSec);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Rotate refresh token and issue new access token' })
  refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
  ): Promise<TokenPairResponseDto> {
    const { accessTtlSec, refreshTtlSec } = this.tokenTtls();
    return this.authService.refresh(
      dto.refreshToken,
      req,
      accessTtlSec,
      refreshTtlSec,
    );
  }

  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke refresh token session(s)' })
  logout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: LogoutDto,
    @Req() req: Request,
  ): Promise<{ success: true }> {
    return this.authService.logout(user.userId, dto.refreshToken, req);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Current user profile, org memberships, and permission keys',
  })
  me(@CurrentUser() user: AuthenticatedUser): Promise<MeResponseDto> {
    return this.authService.getMe(user.userId);
  }

  @Post('change-password')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password for the authenticated user' })
  changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ): Promise<PasswordFlowSuccessDto> {
    return this.authPasswordService.changePassword(user.userId, dto, req);
  }

  @Public()
  @Post('forgot-password')
  @ApiOperation({
    summary: 'Request a password reset email (no user enumeration)',
  })
  forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Req() req: Request,
  ): Promise<ForgotPasswordResponseDto> {
    return this.authPasswordService.forgotPassword(dto.email, req);
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: 'Complete password reset with a single-use token' })
  resetPassword(
    @Body() dto: ResetPasswordDto,
    @Req() req: Request,
  ): Promise<PasswordFlowSuccessDto> {
    return this.authPasswordService.resetPassword(dto, req);
  }

  private tokenTtls(): { accessTtlSec: number; refreshTtlSec: number } {
    const accessRaw = this.config.get('JWT_ACCESS_TTL', { infer: true });
    const refreshRaw = this.config.get('JWT_REFRESH_TTL', { infer: true });
    return {
      accessTtlSec: parseDurationToSeconds(accessRaw),
      refreshTtlSec: parseDurationToSeconds(refreshRaw),
    };
  }
}
