import { HttpStatus, Injectable } from '@nestjs/common';
import { ApiError } from '../../common/errors/api-error';
import { isUniqueViolation } from '../../common/errors/database-error';
import { normalizeMeasurements } from '../../common/health/measurements';
import { type SafeUserDto, toSafeUser } from '../auth/dto/auth-response.dto';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import type { ProfileSetupDto } from './dto/profile-setup.dto';
import { UsersRepository } from './users.repository';

const defined = (fields: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));

@Injectable()
export class UsersService {
  constructor(private readonly repository: UsersRepository) {}

  private async activeUser(userId: string) {
    const user = await this.repository.findById(userId);
    if (!user || user.status !== 'active')
      throw new ApiError('USER_NOT_FOUND', 'User is unavailable', HttpStatus.NOT_FOUND);
    return user;
  }

  async applyReferral(userId: string, code: string): Promise<SafeUserDto> {
    const result = await this.repository.applyReferral(userId, code.trim().toUpperCase());
    if (result.kind === 'saved') return toSafeUser(result.user);
    const messages = {
      unavailable: 'User is unavailable',
      invalid: 'This referral code is not available. Check the code or continue without it.',
      self: 'You cannot use your own referral code.',
      'already-set': 'A referrer has already been recorded for this account.',
      closed: 'Referral codes can only be added before account setup is complete.',
    };
    throw new ApiError(
      'REFERRAL_' + result.kind.replace('-', '_').toUpperCase(),
      messages[result.kind],
      result.kind === 'unavailable' ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST,
    );
  }

  async deleteAccount(userId: string, confirmed: boolean) {
    if (confirmed !== true)
      throw new ApiError(
        'CONFIRMATION_REQUIRED',
        'Confirm account deletion first',
        HttpStatus.BAD_REQUEST,
      );
    const account = await this.activeUser(userId);
    if (account.role === 'super_admin')
      throw new ApiError(
        'ADMIN_ACCOUNT_PROTECTED',
        'Manage administrator accounts through the seeder',
        HttpStatus.FORBIDDEN,
      );
    const result = await this.repository.softDelete(userId);
    if (!result) throw new ApiError('USER_NOT_FOUND', 'User is unavailable', HttpStatus.NOT_FOUND);
    return result;
  }

  async getMe(userId: string): Promise<SafeUserDto> {
    return toSafeUser(await this.activeUser(userId));
  }

  async createProfile(userId: string, input: UpdateProfileDto): Promise<SafeUserDto> {
    const existing = await this.activeUser(userId);
    // A retry after a lost response must not reset an existing profile.
    return existing.profileSetup ? toSafeUser(existing) : this.updateMe(userId, input);
  }

  async updateMe(userId: string, input: UpdateProfileDto): Promise<SafeUserDto> {
    if (!Object.values(input).some((value) => value !== undefined))
      throw new ApiError(
        'VALIDATION_FAILED',
        'At least one profile field is required',
        HttpStatus.BAD_REQUEST,
      );
    const {
      fullName,
      username,
      heightValue,
      heightUnit,
      weightValue,
      weightUnit,
      complete,
      ...details
    } = input;
    const measurements = normalizeMeasurements({
      heightValue,
      heightUnit,
      weightValue,
      weightUnit,
    });
    const supplied = defined(details);
    const changes: Parameters<UsersRepository['updateProfile']>[1] = {
      ...defined({ fullName, username }),
      ...measurements,
    };
    if (Object.keys(supplied).length || complete) {
      const existing = await this.activeUser(userId);
      const setup = { ...existing.profileSetup, ...supplied };
      validateBirthDate(input.dateOfBirth);
      if (
        input.healthGoals &&
        !input.healthGoals.length &&
        (existing.profileCompletedAt || complete)
      )
        throw new ApiError(
          'VALIDATION_FAILED',
          'Choose at least one health goal',
          HttpStatus.BAD_REQUEST,
        );
      validatePhoto(input.photo);
      if (
        complete &&
        (!setup.dateOfBirth ||
          !setup.activityLevel ||
          !Array.isArray(setup.healthGoals) ||
          !setup.healthGoals.length ||
          !(heightValue ?? existing.heightValue) ||
          !(weightValue ?? existing.weightValue))
      )
        throw new ApiError(
          'VALIDATION_FAILED',
          'Complete personal details, activity level and at least one health goal',
          HttpStatus.BAD_REQUEST,
        );
      changes.profileSetup = { ...setup, ...(complete ? { setupDeferred: false } : {}), step: complete ? 7 : (setup.step ?? 0) };
      if (complete) changes.profileCompletedAt = existing.profileCompletedAt ?? new Date();
    }
    try {
      const user = await this.repository.updateProfile(userId, changes);
      if (!user || user.status !== 'active')
        throw new ApiError('USER_NOT_FOUND', 'User is unavailable', HttpStatus.NOT_FOUND);
      return toSafeUser(user);
    } catch (error) {
      if (isUniqueViolation(error, 'users_username_unique'))
        throw new ApiError('USERNAME_TAKEN', 'This username is unavailable', HttpStatus.CONFLICT);
      throw error;
    }
  }

  // Compatibility entry point: setup and account editing share one write path.
  saveSetup(userId: string, input: ProfileSetupDto): Promise<SafeUserDto> {
    return this.updateMe(userId, input);
  }
}

function validateBirthDate(value?: string): void {
  if (value === undefined) return;
  const date = new Date(value + 'T00:00:00Z');
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value ||
    date > new Date() ||
    date.getUTCFullYear() < 1900
  )
    throw new ApiError(
      'VALIDATION_FAILED',
      'Enter a valid date of birth in the past',
      HttpStatus.BAD_REQUEST,
    );
}

function validatePhoto(photo?: string): void {
  if (!photo) return;
  const bytes = Buffer.from(photo.split(',')[1] ?? '', 'base64');
  if (
    bytes.length > 160000 ||
    bytes.length < 4 ||
    bytes[0] !== 0xff ||
    bytes[1] !== 0xd8 ||
    bytes[2] !== 0xff
  )
    throw new ApiError(
      'VALIDATION_FAILED',
      'Choose a JPEG photo smaller than 160 KB',
      HttpStatus.BAD_REQUEST,
    );
}
