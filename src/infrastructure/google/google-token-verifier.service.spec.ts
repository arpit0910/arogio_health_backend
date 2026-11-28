import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client, LoginTicket } from 'google-auth-library';
import { GoogleTokenVerifierService } from './google-token-verifier.service';
import { ApiError } from '../../common/errors/api-error';
import { summarizeError } from '../../common/logging/response-summary';

describe('Google ID-token verification', () => {
  const audience = 'shared-web.apps.googleusercontent.com';
  let verify: jest.SpyInstance;
  let service: GoogleTokenVerifierService;
  beforeEach(() => {
    verify = jest.spyOn(OAuth2Client.prototype, 'verifyIdToken');
    service = new GoogleTokenVerifierService(new ConfigService({ GOOGLE_CLIENT_IDS: [audience] }));
  });
  afterEach(() => jest.restoreAllMocks());

  it('always delegates signature, issuer, expiry and exact audience checks to Google', async () => {
    verify.mockResolvedValue(
      new LoginTicket('', {
        sub: 'verified-subject',
        email: 'EXAMPLE@example.com',
        email_verified: true,
        name: 'Example',
        aud: audience,
        iss: 'https://accounts.google.com',
        iat: 1,
        exp: 2,
      }),
    );
    expect(await service.verify('synthetic-token')).toEqual({
      subject: 'verified-subject',
      email: 'example@example.com',
      emailVerified: true,
      name: 'Example',
    });
    expect(verify).toHaveBeenCalledWith({ idToken: 'synthetic-token', audience: [audience] });
  });

  it.each([
    ['Wrong recipient, payload audience != requiredAudience', 'AUDIENCE_MISMATCH'],
    ['Token used too late, private-claims', 'EXPIRED'],
    ['Token used too early, private-claims', 'CLOCK_SKEW'],
    ['Invalid token signature: private-token', 'INVALID_TOKEN'],
    ['Invalid issuer: private-claims', 'INVALID_TOKEN'],
  ])(
    'returns a safe diagnostic for %s without reflecting private token content',
    async (message, reason) => {
      verify.mockRejectedValue(new Error(message));
      try {
        await service.verify('private-token');
        throw new Error('Expected rejection');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        const apiError = error as ApiError;
        expect(apiError.code).toBe('INVALID_GOOGLE_TOKEN');
        expect(apiError.status).toBe(HttpStatus.UNAUTHORIZED);
        expect(apiError.details).toEqual({ googleReason: reason });
        expect(JSON.stringify(apiError)).not.toMatch(/private-token|private-claims/);
        const summary = summarizeError(apiError.status, apiError.code, apiError.details, apiError);
        expect(summary.reason).not.toMatch(/private-token|private-claims/);
      }
    },
  );

  it('separates key-fetch failure from invalid credentials', async () => {
    verify.mockRejectedValue(
      Object.assign(
        new Error('Failed to retrieve verification certificates: private transport data'),
        { code: 'ETIMEDOUT' },
      ),
    );
    await expect(service.verify('private-token')).rejects.toMatchObject({
      code: 'GOOGLE_VERIFICATION_UNAVAILABLE',
      status: HttpStatus.SERVICE_UNAVAILABLE,
    });
  });

  it('ignores untrusted diagnostic details when generating public summaries', () => {
    const result = summarizeError(
      401,
      'INVALID_GOOGLE_TOKEN',
      { googleReason: 'private-token' },
      new Error('private-token'),
    );
    expect(JSON.stringify(result)).not.toContain('private-token');
  });
});
