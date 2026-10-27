import { HttpStatus } from '@nestjs/common';
import type { User } from '../../database/schema';
import { UsersService } from './users.service';
import type { UsersRepository } from './users.repository';

const user: User = {
  id: '11111111-1111-4111-8111-111111111111',
  fullName: 'Arogio User',
  username: 'arogio_user',
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
  passwordHash: 'must-not-leak',
  status: 'active',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

describe('UsersService', () => {
  const repository = {
    findById: jest.fn(),
    updateProfile: jest.fn(),
  } as unknown as jest.Mocked<UsersRepository>;
  const service = new UsersService(repository);

  beforeEach(() => jest.clearAllMocks());

  it('returns a safe current-user profile', async () => {
    repository.findById.mockResolvedValue(user);
    const result = await service.getMe(user.id);
    expect(result.id).toBe(user.id);
    expect(result).not.toHaveProperty('passwordHash');
    expect(result.bmi).toBe(23);
  });

  it('rejects an empty profile update', async () => {
    await expect(service.updateMe(user.id, {})).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
      status: HttpStatus.BAD_REQUEST,
    });
  });

  it('updates only allowed profile fields', async () => {
    repository.updateProfile.mockResolvedValue({ ...user, fullName: 'Updated User' });
    const result = await service.updateMe(user.id, { fullName: 'Updated User' });
    expect(repository.updateProfile).toHaveBeenCalledWith(user.id, { fullName: 'Updated User' });
    expect(result.fullName).toBe('Updated User');
  });

  it('stores imperial health measurements and calculates BMI from normalized values', async () => {
    repository.updateProfile.mockResolvedValue({
      ...user,
      heightValue: 70.9,
      heightUnit: 'in',
      heightCm: 180.1,
      weightValue: 178.6,
      weightUnit: 'lb',
      weightKg: 81,
    });
    const result = await service.updateMe(user.id, {
      heightValue: 70.9,
      heightUnit: 'in',
      weightValue: 178.6,
      weightUnit: 'lb',
    });
    expect(repository.updateProfile).toHaveBeenCalledWith(user.id, {
      heightValue: 70.9,
      heightUnit: 'in',
      heightCm: 180.1,
      weightValue: 178.6,
      weightUnit: 'lb',
      weightKg: 81,
    });
    expect(result.heightUnit).toBe('in');
    expect(result.weightUnit).toBe('lb');
    expect(result.bmi).toBe(25);
  });

  it('requires a measurement value and unit together', async () => {
    await expect(service.updateMe(user.id, { heightValue: 68 })).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
      status: HttpStatus.BAD_REQUEST,
    });
  });

  it('maps duplicate usernames to a safe conflict', async () => {
    repository.updateProfile.mockRejectedValue({
      code: '23505',
      constraint: 'users_username_unique',
    });
    await expect(service.updateMe(user.id, { username: 'taken' })).rejects.toMatchObject({
      code: 'USERNAME_TAKEN',
      status: HttpStatus.CONFLICT,
    });
  });

  it('saves personal details and measurements together without resetting setup or preferences', async () => {
    const existing = {
      ...user,
      profileSetup: { step: 7, healthReminders: false, healthGoals: ['weight_management'] },
      profileCompletedAt: new Date('2026-01-02'),
    };
    repository.findById.mockResolvedValue(existing);
    repository.updateProfile.mockResolvedValue(existing);
    await service.updateMe(user.id, {
      fullName: 'Arpit Vijay',
      dateOfBirth: '2001-03-17',
      location: 'Jaipur, Rajasthan',
      gender: 'male',
      weightValue: 70,
      weightUnit: 'kg',
    });
    expect(repository.updateProfile).toHaveBeenCalledWith(
      user.id,
      expect.objectContaining({
        fullName: 'Arpit Vijay',
        weightValue: 70,
        weightKg: 70,
        profileSetup: {
          ...existing.profileSetup,
          dateOfBirth: '2001-03-17',
          location: 'Jaipur, Rajasthan',
          gender: 'male',
        },
      }),
    );
    expect(repository.updateProfile.mock.calls[0]?.[1]).not.toHaveProperty('profileCompletedAt');
  });

  it('rejects invalid birthdays before updating any fields', async () => {
    repository.findById.mockResolvedValue(user);
    await expect(
      service.updateMe(user.id, { fullName: 'New Name', dateOfBirth: '2001-02-29' }),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    expect(repository.updateProfile).not.toHaveBeenCalled();
  });

  it('rejects invalid avatar content and empty goals', async () => {
    repository.findById.mockResolvedValue({ ...user, profileCompletedAt: new Date() });
    await expect(
      service.updateMe(user.id, { photo: 'data:image/jpeg;base64,aGVsbG8=' }),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    await expect(service.updateMe(user.id, { healthGoals: [] })).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
    });
    expect(repository.updateProfile).not.toHaveBeenCalled();
  });
});
