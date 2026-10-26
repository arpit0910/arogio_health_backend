import { HttpStatus, Injectable } from '@nestjs/common';
import { ApiError } from '../../common/errors/api-error';
import { normalizeMeasurements } from '../../common/health/measurements';
import { type SafeUserDto, toSafeUser } from '../auth/dto/auth-response.dto';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import type { ProfileSetupDto } from './dto/profile-setup.dto';
import { UsersRepository } from './users.repository';

function isUsernameConflict(error: unknown): boolean {
  const pgError = error as { code?: string; constraint?: string };
  return pgError.code === '23505' && pgError.constraint === 'users_username_unique';
}

@Injectable()
export class UsersService {
  constructor(private readonly repository: UsersRepository) {}

  async getMe(userId: string): Promise<SafeUserDto> {
    const user = await this.repository.findById(userId);
    if (!user || user.status !== 'active') {
      throw new ApiError('USER_NOT_FOUND', 'User is unavailable', HttpStatus.NOT_FOUND);
    }
    return toSafeUser(user);
  }

  async updateMe(userId: string, input: UpdateProfileDto): Promise<SafeUserDto> {
    if (
      input.fullName === undefined &&
      input.username === undefined &&
      input.heightValue === undefined &&
      input.heightUnit === undefined &&
      input.weightValue === undefined &&
      input.weightUnit === undefined
    ) {
      throw new ApiError(
        'VALIDATION_FAILED',
        'At least one profile field is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    try {
      const user = await this.repository.updateProfile(userId, {
        ...input,
        ...normalizeMeasurements(input),
      });
      if (!user || user.status !== 'active') {
        throw new ApiError('USER_NOT_FOUND', 'User is unavailable', HttpStatus.NOT_FOUND);
      }
      return toSafeUser(user);
    } catch (error) {
      if (isUsernameConflict(error)) {
        throw new ApiError('USERNAME_TAKEN', 'This username is unavailable', HttpStatus.CONFLICT);
      }
      throw error;
    }
  }
  async saveSetup(userId: string, input: ProfileSetupDto): Promise<SafeUserDto> {
    const existing = await this.repository.findById(userId);
    if (!existing || existing.status !== 'active') {
      throw new ApiError('USER_NOT_FOUND', 'User is unavailable', HttpStatus.NOT_FOUND);
    }
    const { complete, heightValue, heightUnit, weightValue, weightUnit, ...details } = input;
    const setup = { ...existing.profileSetup, ...details };
    if (details.dateOfBirth) {
      const date = new Date(details.dateOfBirth + 'T00:00:00Z');
      if (
        !Number.isFinite(date.getTime()) ||
        date.toISOString().slice(0, 10) !== details.dateOfBirth ||
        date > new Date() ||
        date.getUTCFullYear() < 1900
      ) {
        throw new ApiError(
          'VALIDATION_FAILED',
          'Enter a valid date of birth in the past',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
    const measurements = { heightValue, heightUnit, weightValue, weightUnit };
    const normalized = normalizeMeasurements(measurements);
    if (
      complete &&
      (!setup.dateOfBirth ||
        !setup.activityLevel ||
        !Array.isArray(setup.healthGoals) ||
        !setup.healthGoals.length ||
        !(heightValue ?? existing.heightValue) ||
        !(weightValue ?? existing.weightValue))
    ) {
      throw new ApiError(
        'VALIDATION_FAILED',
        'Complete personal details, activity level and at least one health goal',
        HttpStatus.BAD_REQUEST,
      );
    }
    const user = await this.repository.updateProfile(userId, {
      ...measurements,
      ...normalized,
      profileSetup: { ...setup, step: complete ? 7 : (setup.step ?? 0) },
      ...(complete ? { profileCompletedAt: existing.profileCompletedAt ?? new Date() } : {}),
    });
    if (!user) throw new ApiError('USER_NOT_FOUND', 'User is unavailable', HttpStatus.NOT_FOUND);
    return toSafeUser(user);
  }
}
