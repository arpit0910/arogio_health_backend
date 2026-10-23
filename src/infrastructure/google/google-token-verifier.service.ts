import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

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
    const ticket = await this.client.verifyIdToken({ idToken, audience: this.audiences });
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
