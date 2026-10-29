import { Transform } from 'class-transformer';
import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export const normalizeReferralCode = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;
export class ApplyReferralDto {
  @ApiProperty({ example: 'A1B2C3D4E5F6', description: 'The code from the friend who invited you' })
  @Transform(normalizeReferralCode)
  @IsString()
  @Matches(/^[A-F0-9]{12}$/)
  referralCode: string;
}
