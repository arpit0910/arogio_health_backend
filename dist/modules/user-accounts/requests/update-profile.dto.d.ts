import { ProfileSetupDto } from './profile-setup.dto';
declare const UpdateProfileDto_base: import("@nestjs/common").Type<Pick<ProfileSetupDto, "bloodGroup" | "gender" | "location" | "complete" | "flowVersion" | "contactNumber" | "setupDeferred" | "dateOfBirth" | "activityLevel" | "healthGoals" | "referralSource" | "healthReminders" | "tipsAndInsights" | "productUpdates" | "step">>;
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
