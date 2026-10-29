import { AuthRepository } from './auth.repository';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { RequestUser } from '../../common/auth/request-user';

interface AccessTokenPayload {
  sub: string;
  sid: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly repository: AuthRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      issuer: config.getOrThrow<string>('JWT_ISSUER'),
      audience: config.getOrThrow<string>('JWT_AUDIENCE'),
    });
  }

  async validate(payload: AccessTokenPayload): Promise<RequestUser> {
    if (
      !payload.sub ||
      !payload.sid ||
      !(await this.repository.isAccessSessionActive(payload.sub, payload.sid))
    )
      throw new UnauthorizedException();
    return { userId: payload.sub, sessionId: payload.sid };
  }
}
