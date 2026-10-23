import { HttpStatus, Injectable } from '@nestjs/common';
import { ApiError } from '../../common/errors/api-error';
import { normalizeMeasurements } from '../../common/health/measurements';
import { type SafeUserDto, toSafeUser } from '../auth/dto/auth-response.dto';
import type { UpdateProfileDto } from './dto/update-profile.dto';
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
}
