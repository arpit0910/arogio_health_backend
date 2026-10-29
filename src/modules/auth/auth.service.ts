import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ApiError } from '../../common/errors/api-error';
import { isUniqueViolation } from '../../common/errors/database-error';
import { normalizeMeasurements } from '../../common/health/measurements';
import { GoogleTokenVerifier } from '../../infrastructure/google/google-token-verifier.service';
import { AuthRepository } from './auth.repository';
import type { GoogleLoginDto, LoginDto, RefreshTokenDto, RegisterDto } from './dto/auth.dto';
import { type AuthResponseDto, type TokenPairDto, toSafeUser } from './dto/auth-response.dto';
import { PasswordService } from './password.service';

function tokenHash(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('base64url');
}

@Injectable()
export class AuthService {
  private readonly accessTtl: number;
  private readonly refreshTtlMs: number;

  constructor(
    private readonly repository: AuthRepository,
    private readonly passwords: PasswordService,
    private readonly google: GoogleTokenVerifier,
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.accessTtl = config.getOrThrow<number>('JWT_ACCESS_TTL_SECONDS');
    this.refreshTtlMs = config.getOrThrow<number>('REFRESH_TOKEN_TTL_DAYS') * 86_400_000;
  }

  async register(input: RegisterDto): Promise<AuthResponseDto> {
    let referredByUserId: string | undefined;
    if (input.referralCode) {
      const referrer = await this.repository.findUserByReferralCode(
        input.referralCode.trim().toUpperCase(),
      );
      if (!referrer || referrer.status !== 'active' || !referrer.profileCompletedAt)
        throw new ApiError(
          'INVALID_REFERRAL_CODE',
          'This referral code is not available. Check the code or continue without it.',
          HttpStatus.BAD_REQUEST,
        );
      referredByUserId = referrer.id;
    }
    const passwordHash = await this.passwords.hash(input.password);
    const measurements = normalizeMeasurements(input);
    try {
      const user = await this.repository.createPasswordUser({
        email: input.email,
        passwordHash,
        referredByUserId,
        fullName: input.fullName,
        ...measurements,
      });
      return { ...(await this.createLoginSession(user.id)), user: toSafeUser(user) };
    } catch (error) {
      if (isUniqueViolation(error, 'users_email_unique')) {
        throw new ApiError(
          'EMAIL_ALREADY_REGISTERED',
          'An account with this email already exists',
          HttpStatus.CONFLICT,
        );
      }
      throw error;
    }
  }

  async login(input: LoginDto): Promise<AuthResponseDto> {
    const user = await this.repository.findUserByEmail(input.email);
    const passwordValid = await this.passwords.verify(user?.passwordHash, input.password);
    if (!user || !passwordValid || user.status !== 'active') {
      throw new ApiError(
        'INVALID_CREDENTIALS',
        'Invalid email or password',
        HttpStatus.UNAUTHORIZED,
      );
    }
    return { ...(await this.createLoginSession(user.id)), user: toSafeUser(user) };
  }

  async googleLogin(input: GoogleLoginDto): Promise<AuthResponseDto> {
    let identity;
    try {
      identity = await this.google.verify(input.idToken);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        'INVALID_GOOGLE_TOKEN',
        'Google authentication failed',
        HttpStatus.UNAUTHORIZED,
      );
    }

    let user = await this.repository.findGoogleUser(identity.subject);
    if (!user) {
      if (identity.email && (await this.repository.findUserByEmail(identity.email))) {
        throw new ApiError(
          'ACCOUNT_LINK_REQUIRED',
          'Sign in with the existing method before linking Google',
          HttpStatus.CONFLICT,
        );
      }
      let referredByUserId: string | undefined;
      if (input.referralCode) {
        const referrer = await this.repository.findUserByReferralCode(
          input.referralCode.trim().toUpperCase(),
        );
        if (!referrer || referrer.status !== 'active' || !referrer.profileCompletedAt)
          throw new ApiError(
            'INVALID_REFERRAL_CODE',
            'This referral code is not available. Check the code or continue without it.',
            HttpStatus.BAD_REQUEST,
          );
        referredByUserId = referrer.id;
      }
      try {
        user = await this.repository.createGoogleUser({
          referredByUserId,
          subject: identity.subject,
          email: identity.email,
          fullName: identity.name,
          emailVerified: identity.emailVerified,
        });
      } catch (error) {
        if (isUniqueViolation(error, 'users_email_unique')) {
          throw new ApiError(
            'ACCOUNT_LINK_REQUIRED',
            'Sign in with the existing method before linking Google',
            HttpStatus.CONFLICT,
          );
        }
        throw error;
      }
    }

    if (user.status !== 'active') {
      throw new ApiError(
        'ACCOUNT_UNAVAILABLE',
        'This account is unavailable',
        HttpStatus.FORBIDDEN,
      );
    }
    return { ...(await this.createLoginSession(user.id)), user: toSafeUser(user) };
  }

  async refresh(input: RefreshTokenDto): Promise<TokenPairDto> {
    const refreshToken = randomBytes(32).toString('base64url');
    const sessionId = randomUUID();
    const result = await this.repository.rotateSession({
      currentTokenHash: tokenHash(input.refreshToken),
      replacement: {
        id: sessionId,
        userId: randomUUID(),
        tokenHash: tokenHash(refreshToken),
        familyId: randomUUID(),
        expiresAt: new Date(Date.now() + this.refreshTtlMs),
      },
      now: new Date(),
    });

    if (result.kind !== 'rotated') {
      throw new ApiError(
        'INVALID_REFRESH_TOKEN',
        'Refresh token is invalid or expired',
        HttpStatus.UNAUTHORIZED,
      );
    }
    return this.buildTokenPair(result.userId, result.sessionId, refreshToken);
  }

  async logout(input: RefreshTokenDto): Promise<void> {
    await this.repository.revokeSession(tokenHash(input.refreshToken), new Date());
  }

  private async createLoginSession(userId: string): Promise<TokenPairDto> {
    const sessionId = randomUUID();
    const familyId = randomUUID();
    const refreshToken = randomBytes(32).toString('base64url');
    await this.repository.createSession({
      id: sessionId,
      userId,
      familyId,
      tokenHash: tokenHash(refreshToken),
      expiresAt: new Date(Date.now() + this.refreshTtlMs),
    });
    return this.buildTokenPair(userId, sessionId, refreshToken);
  }

  private async buildTokenPair(
    userId: string,
    sessionId: string,
    refreshToken: string,
  ): Promise<TokenPairDto> {
    return {
      accessToken: await this.jwt.signAsync({ sub: userId, sid: sessionId }),
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.accessTtl,
    };
  }
}
