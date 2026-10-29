import type { User } from '../../../database/schema';
export declare class SafeUserDto {
    referralCode: string;
    hasReferrer: boolean;
    profileSetup: Record<string, unknown> | null;
    profileCompletedAt: Date | null;
    id: string;
    fullName: string | null;
    username: string | null;
    email: string | null;
    mobileNumber: string | null;
    heightValue: number | null;
    heightUnit: 'cm' | 'in' | null;
    weightValue: number | null;
    weightUnit: 'kg' | 'lb' | null;
    bmi: number | null;
    status: 'active' | 'disabled' | 'pending';
    createdAt: Date;
    updatedAt: Date;
}
export declare class TokenPairDto {
    accessToken: string;
    refreshToken: string;
    tokenType: 'Bearer';
    expiresIn: number;
}
export declare class AuthResponseDto extends TokenPairDto {
    user: SafeUserDto;
}
export declare function toSafeUser(user: User): SafeUserDto;
