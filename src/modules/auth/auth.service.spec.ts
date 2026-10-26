import { HttpStatus } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import type { User } from '../../database/schema';
import type {
  GoogleTokenVerifier,
  VerifiedGoogleIdentity,
} from '../../infrastructure/google/google-token-verifier.service';
import type { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import type { PasswordService } from './password.service';

const user: User = {
  id: '11111111-1111-4111-8111-111111111111',
  fullName: 'Arogio User',
  username: null,
  email: 'user@example.com',
  emailVerifiedAt: null,
  mobileNumber: null,
  mobileVerifiedAt: null,
  heightCm: 172.5,
  weightKg: 68.4,
  heightValue: 172.5,
  heightUnit: 'cm',
  weightValue: 68.4,
  weightUnit: 'kg',
  profileSetup: null,
  profileCompletedAt: null,
  passwordHash: 'stored-hash',
  status: 'active',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

const googleIdentity: VerifiedGoogleIdentity = {
  subject: 'google-subject',
  email: 'google@example.com',
  emailVerified: true,
  name: 'Google User',
};

describe('AuthService', () => {
  const repository = {
    createPasswordUser: jest.fn(),
    findUserByEmail: jest.fn(),
    findUserById: jest.fn(),
    findGoogleUser: jest.fn(),
    createGoogleUser: jest.fn(),
    createSession: jest.fn(),
    rotateSession: jest.fn(),
    revokeSession: jest.fn(),
  } as unknown as jest.Mocked<AuthRepository>;
  const passwords = {
    hash: jest.fn(),
    verify: jest.fn(),
  } as unknown as jest.Mocked<PasswordService>;
  const google = { verify: jest.fn() } as unknown as jest.Mocked<GoogleTokenVerifier>;
  const jwt = { signAsync: jest.fn() } as unknown as jest.Mocked<JwtService>;
  const config = {
    getOrThrow: jest.fn((key: string) =>
      key === 'JWT_ACCESS_TTL_SECONDS' ? 900 : key === 'REFRESH_TOKEN_TTL_DAYS' ? 30 : undefined,
    ),
  } as unknown as ConfigService;
  const service = new AuthService(repository, passwords, google, jwt, config);

  beforeEach(() => {
    jest.clearAllMocks();
    repository.createSession.mockResolvedValue(undefined);
    jwt.signAsync.mockResolvedValue('access-token');
  });

  it('registers a normalized validated password account and omits its hash', async () => {
    passwords.hash.mockResolvedValue('stored-hash');
    repository.createPasswordUser.mockResolvedValue(user);
    const result = await service.register({
      email: user.email!,
      password: 'SecurePassword1',
      fullName: user.fullName!,
      heightValue: 68,
      heightUnit: 'in',
      weightValue: 150.8,
      weightUnit: 'lb',
    });
    expect(repository.createPasswordUser).toHaveBeenCalledWith({
      email: user.email,
      passwordHash: 'stored-hash',
      fullName: user.fullName,
      heightValue: 68,
      heightUnit: 'in',
      heightCm: 172.7,
      weightValue: 150.8,
      weightUnit: 'lb',
      weightKg: 68.4,
    });
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(result.accessToken).toBe('access-token');
  });

  it('maps a duplicate email constraint to a safe conflict', async () => {
    passwords.hash.mockResolvedValue('stored-hash');
    repository.createPasswordUser.mockRejectedValue({
      code: '23505',
      constraint: 'users_email_unique',
    });
    await expect(
      service.register({ email: user.email!, password: 'SecurePassword1' }),
    ).rejects.toMatchObject({ code: 'EMAIL_ALREADY_REGISTERED', status: HttpStatus.CONFLICT });
  });

  it('logs in an active password user', async () => {
    repository.findUserByEmail.mockResolvedValue(user);
    passwords.verify.mockResolvedValue(true);
    const result = await service.login({ email: user.email!, password: 'SecurePassword1' });
    expect(result.user.id).toBe(user.id);
    expect(repository.createSession).toHaveBeenCalledTimes(1);
  });

  it('uses one generic error for unknown users and bad passwords', async () => {
    repository.findUserByEmail.mockResolvedValue(undefined);
    passwords.verify.mockResolvedValue(false);
    await expect(
      service.login({ email: 'missing@example.com', password: 'Anything12345' }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', status: HttpStatus.UNAUTHORIZED });
    expect(passwords.verify).toHaveBeenCalledWith(undefined, 'Anything12345');
  });

  it('uses an existing Google identity without creating another user', async () => {
    google.verify.mockResolvedValue(googleIdentity);
    repository.findGoogleUser.mockResolvedValue(user);
    const result = await service.googleLogin({ idToken: 'a-valid-google-token-value' });
    expect(result.user.id).toBe(user.id);
    expect(repository.createGoogleUser).not.toHaveBeenCalled();
  });

  it('creates a new Google identity with verified claims', async () => {
    google.verify.mockResolvedValue(googleIdentity);
    repository.findGoogleUser.mockResolvedValue(undefined);
    repository.findUserByEmail.mockResolvedValue(undefined);
    repository.createGoogleUser.mockResolvedValue({ ...user, email: googleIdentity.email });
    await service.googleLogin({ idToken: 'a-valid-google-token-value' });
    expect(repository.createGoogleUser).toHaveBeenCalledWith({
      subject: googleIdentity.subject,
      email: googleIdentity.email,
      fullName: googleIdentity.name,
      emailVerified: true,
    });
  });

  it('does not merge a Google identity merely because email matches', async () => {
    google.verify.mockResolvedValue(googleIdentity);
    repository.findGoogleUser.mockResolvedValue(undefined);
    repository.findUserByEmail.mockResolvedValue(user);
    await expect(
      service.googleLogin({ idToken: 'a-valid-google-token-value' }),
    ).rejects.toMatchObject({ code: 'ACCOUNT_LINK_REQUIRED', status: HttpStatus.CONFLICT });
  });

  it('maps Google verification failures to a safe authentication error', async () => {
    google.verify.mockRejectedValue(new Error('signature detail'));
    await expect(
      service.googleLogin({ idToken: 'invalid-google-token-value' }),
    ).rejects.toMatchObject({ code: 'INVALID_GOOGLE_TOKEN', status: HttpStatus.UNAUTHORIZED });
  });

  it('rotates a valid refresh session', async () => {
    repository.rotateSession.mockResolvedValue({
      kind: 'rotated',
      userId: user.id,
      sessionId: '22222222-2222-4222-8222-222222222222',
    });
    const result = await service.refresh({ refreshToken: 'x'.repeat(43) });
    expect(result.refreshToken).not.toBe('x'.repeat(43));
    expect(result.accessToken).toBe('access-token');
  });

  it.each(['invalid', 'expired', 'reused', 'disabled'] as const)(
    'rejects a %s refresh session with the same public error',
    async (kind) => {
      repository.rotateSession.mockResolvedValue({ kind });
      await expect(service.refresh({ refreshToken: 'x'.repeat(43) })).rejects.toMatchObject({
        code: 'INVALID_REFRESH_TOKEN',
        status: HttpStatus.UNAUTHORIZED,
      });
    },
  );

  it('makes logout safe and idempotent', async () => {
    repository.revokeSession.mockResolvedValue(undefined);
    await expect(service.logout({ refreshToken: 'x'.repeat(43) })).resolves.toBeUndefined();
  });
});
