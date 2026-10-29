import { ProfileSetupDto } from './profile-setup.dto';
declare const UpdateProfileDto_base: import("@nestjs/common").Type<Pick<ProfileSetupDto, "dateOfBirth" | "activityLevel" | "healthGoals" | "gender" | "location" | "referralSource" | "healthReminders" | "tipsAndInsights" | "productUpdates" | "step" | "complete">>;
export declare class UpdateProfileDto extends UpdateProfileDto_base {
    photo?: string;
    fullName?: string;
    username?: string;
    heightValue?: number;
    heightUnit?: 'cm' | 'in';
    weightValue?: number;
    weightUnit?: 'kg' | 'lb';
}
export {};
