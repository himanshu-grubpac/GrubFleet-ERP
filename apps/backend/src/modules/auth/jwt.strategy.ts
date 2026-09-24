import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Env } from '../../config/env.schema';
import { AuthRepository } from './auth.repository';
import { DEV_JWT_ACCESS_SECRET } from './constants/auth.constants';
import type {
  AuthenticatedUser,
  JwtAccessPayload,
} from './types/authenticated-user.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService<Env, true>,
    private readonly authRepository: AuthRepository,
  ) {
    const secret =
      config.get('JWT_ACCESS_SECRET', { infer: true }) ?? DEV_JWT_ACCESS_SECRET;
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtAccessPayload): Promise<AuthenticatedUser> {
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException({
        message: 'Invalid access token',
        code: 'INVALID_ACCESS_TOKEN',
      });
    }

    const user = await this.authRepository.findUserById(payload.sub);
    if (!user?.isActive) {
      throw new UnauthorizedException({
        message: 'Invalid access token',
        code: 'INVALID_ACCESS_TOKEN',
      });
    }

    return { userId: user.id, email: user.email };
  }
}
