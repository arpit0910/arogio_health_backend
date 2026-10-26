import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { User } from '../../../database/schema';

export class SafeUserDto {
  @ApiPropertyOptional({ nullable: true })
  profileSetup: Record<string, unknown> | null;

  @ApiPropertyOptional({ nullable: true })
  profileCompletedAt: Date | null;

  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiPropertyOptional({ nullable: true })
  fullName: string | null;

  @ApiPropertyOptional({ nullable: true })
  username: string | null;

  @ApiPropertyOptional({ nullable: true })
  email: string | null;

  @ApiPropertyOptional({ nullable: true })
  mobileNumber: string | null;

  @ApiPropertyOptional({ nullable: true, example: 68, description: 'Entered height' })
  heightValue: number | null;

  @ApiPropertyOptional({ nullable: true, enum: ['cm', 'in'] })
  heightUnit: 'cm' | 'in' | null;

  @ApiPropertyOptional({ nullable: true, example: 150.8, description: 'Entered weight' })
  weightValue: number | null;

  @ApiPropertyOptional({ nullable: true, enum: ['kg', 'lb'] })
  weightUnit: 'kg' | 'lb' | null;

  @ApiPropertyOptional({
    nullable: true,
    example: 23,
    description: 'BMI derived from height and weight',
  })
  bmi: number | null;

  @ApiProperty({ enum: ['active', 'disabled', 'pending'] })
  status: 'active' | 'disabled' | 'pending';

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt: Date;
}

export class TokenPairDto {
  @ApiProperty({ description: 'Short-lived Arogio API bearer token' })
  accessToken: string;

  @ApiProperty({ description: 'One-time rotating refresh token' })
  refreshToken: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType: 'Bearer';

  @ApiProperty({ example: 900, description: 'Access token lifetime in seconds' })
  expiresIn: number;
}

export class AuthResponseDto extends TokenPairDto {
  @ApiProperty({ type: SafeUserDto })
  user: SafeUserDto;
}

export function toSafeUser(user: User): SafeUserDto {
  const bmi =
    user.heightCm && user.weightKg
      ? Math.round((user.weightKg / (user.heightCm / 100) ** 2) * 10) / 10
      : null;
  return {
    profileSetup: user.profileSetup,
    profileCompletedAt: user.profileCompletedAt,
    id: user.id,
    fullName: user.fullName,
    username: user.username,
    email: user.email,
    mobileNumber: user.mobileNumber,
    heightValue: user.heightValue,
    heightUnit: user.heightUnit,
    weightValue: user.weightValue,
    weightUnit: user.weightUnit,
    bmi,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
