import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { ApiError } from '../../common/errors/api-error';
import { HttpStatus } from '@nestjs/common';

export interface VerifiedGoogleIdentity {
  subject: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
}

export abstract class GoogleTokenVerifier {
  abstract verify(idToken: string): Promise<VerifiedGoogleIdentity>;
}

@Injectable()
export class GoogleTokenVerifierService implements GoogleTokenVerifier {
  private readonly client = new OAuth2Client();
  private readonly audiences: string[];

  constructor(config: ConfigService) {
    this.audiences = config.getOrThrow<string[]>('GOOGLE_CLIENT_IDS');
  }

  async verify(idToken: string): Promise<VerifiedGoogleIdentity> {
    let ticket;
    try {
      ticket = await this.client.verifyIdToken({ idToken, audience: this.audiences });
    } catch (error) {
      // Google's exception messages can contain the entire JWT or its claims.
      // Never pass those messages or their causes to responses or logging.
      const message = error instanceof Error ? error.message : '';
      const code =
        typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
      if (/Wrong recipient/.test(message)) {
        throw new ApiError(
          'INVALID_GOOGLE_TOKEN',
          'Google sign-in is not configured for this app version. Please use email sign-in while setup is corrected.',
          HttpStatus.UNAUTHORIZED,
          { googleReason: 'AUDIENCE_MISMATCH' },
        );
      }
      if (/Token used too late/.test(message)) {
        throw new ApiError(
          'INVALID_GOOGLE_TOKEN',
          'Google sign-in expired. Please choose your Google account again.',
          HttpStatus.UNAUTHORIZED,
          { googleReason: 'EXPIRED' },
        );
      }
      if (/Token used too early/.test(message)) {
        throw new ApiError(
          'INVALID_GOOGLE_TOKEN',
          'Google sign-in could not verify the sign-in time. Please try again.',
          HttpStatus.UNAUTHORIZED,
          { googleReason: 'CLOCK_SKEW' },
        );
      }
      if (
        /Failed to retrieve verification certificates/.test(message) ||
        [
          'ENOTFOUND',
          'ECONNRESET',
          'ETIMEDOUT',
          'ECONNREFUSED',
          'EAI_AGAIN',
          'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
          'CERT_HAS_EXPIRED',
        ].includes(code)
      ) {
        throw new ApiError(
          'GOOGLE_VERIFICATION_UNAVAILABLE',
          'Google sign-in is temporarily unavailable. Please try again or sign in with email.',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      throw new ApiError(
        'INVALID_GOOGLE_TOKEN',
        'Google authentication failed. Please choose your Google account again.',
        HttpStatus.UNAUTHORIZED,
        { googleReason: 'INVALID_TOKEN' },
      );
    }
    const payload = ticket.getPayload();
    if (!payload?.sub) throw new Error('Google token has no subject');
    return {
      subject: payload.sub,
      email: payload.email?.trim().toLowerCase() ?? null,
      emailVerified: payload.email_verified === true,
      name: payload.name?.trim() || null,
    };
  }
}
