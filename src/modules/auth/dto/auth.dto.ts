import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const normalizeEmail = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

const number = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' && value.trim() !== '' ? Number(value) : value;

export class RegisterDto {
  @ApiProperty({ example: 'person@example.com' })
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({ minLength: 12, maxLength: 128, writeOnly: true })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @Matches(/[a-z]/, { message: 'password must contain a lowercase letter' })
  @Matches(/[A-Z]/, { message: 'password must contain an uppercase letter' })
  @Matches(/[0-9]/, { message: 'password must contain a number' })
  password: string;

  @ApiPropertyOptional({ example: 'Arogio User', maxLength: 100 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName?: string;

  @ApiPropertyOptional({
    example: 68,
    minimum: 20,
    maximum: 300,
    description: 'Height in the selected unit',
  })
  @Transform(number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(20)
  @Max(300)
  heightValue?: number;

  @ApiPropertyOptional({ enum: ['cm', 'in'], example: 'in' })
  @IsOptional()
  @IsIn(['cm', 'in'])
  heightUnit?: 'cm' | 'in';

  @ApiPropertyOptional({
    example: 150.8,
    minimum: 2,
    maximum: 1102.3,
    description: 'Weight in the selected unit',
  })
  @Transform(number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(2)
  @Max(1102.3)
  weightValue?: number;

  @ApiPropertyOptional({ enum: ['kg', 'lb'], example: 'lb' })
  @IsOptional()
  @IsIn(['kg', 'lb'])
  weightUnit?: 'kg' | 'lb';
}

export class LoginDto {
  @ApiProperty({ example: 'person@example.com' })
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({ writeOnly: true })
  @IsString()
  @MaxLength(128)
  password: string;
}

export class GoogleLoginDto {
  @ApiProperty({ description: 'Google ID token issued for an allowed client', writeOnly: true })
  @IsString()
  @MinLength(20)
  @MaxLength(8_192)
  idToken: string;
}

export class RefreshTokenDto {
  @ApiProperty({ writeOnly: true })
  @IsString()
  @MinLength(40)
  @MaxLength(256)
  refreshToken: string;
}
