import { Transform } from 'class-transformer';
import {
  IsNumber,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

const normalizeUsername = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

const number = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' && value.trim() !== '' ? Number(value) : value;

export class UpdateProfileDto {
  @ApiPropertyOptional({ minLength: 2, maxLength: 100 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName?: string;

  @ApiPropertyOptional({ minLength: 3, maxLength: 30, pattern: '^[a-z0-9_]+$' })
  @Transform(normalizeUsername)
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-z0-9_]+$/, {
    message: 'username may contain lowercase letters, numbers, and underscores only',
  })
  username?: string;

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
