import {
  ValidateIf,
  IsString,
  IsNumber,
  IsIn,
  IsArray,
  ArrayUnique,
  IsBoolean,
  IsInt,
  Min,
  Max,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ProfileSetupDto {
  @ApiPropertyOptional({ minimum: 20, maximum: 300 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(20)
  @Max(300)
  heightValue?: number;
  @ApiPropertyOptional({ enum: ['cm', 'in'] })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsIn(['cm', 'in'])
  heightUnit?: 'cm' | 'in';
  @ApiPropertyOptional({ minimum: 2, maximum: 1102.3 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(2)
  @Max(1102.3)
  weightValue?: number;
  @ApiPropertyOptional({ enum: ['kg', 'lb'] })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsIn(['kg', 'lb'])
  weightUnit?: 'kg' | 'lb';
  @ApiPropertyOptional()
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateOfBirth?: string;
  @ApiPropertyOptional()
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsIn(['sedentary', 'lightly_active', 'moderately_active', 'very_active'])
  activityLevel?: string;
  @ApiPropertyOptional()
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsArray()
  @ArrayUnique()
  @IsIn(
    ['weight_management', 'fitness_activity', 'better_eating', 'improve_sleep', 'manage_stress'],
    { each: true },
  )
  healthGoals?: string[];
  @ApiPropertyOptional()
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsIn(['female', 'male', 'other', 'prefer_not_to_say'])
  gender?: string;
  @ApiPropertyOptional()
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(100)
  location?: string;
  @ApiPropertyOptional()
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(100)
  referralSource?: string;
  @ApiPropertyOptional()
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsBoolean()
  healthReminders?: boolean;
  @ApiPropertyOptional()
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsBoolean()
  tipsAndInsights?: boolean;
  @ApiPropertyOptional()
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsBoolean()
  productUpdates?: boolean;
  @ApiPropertyOptional()
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(7)
  step?: number;
  @ApiPropertyOptional()
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsBoolean()
  complete?: boolean;
}
