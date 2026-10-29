export declare class ProfileSetupDto {
    heightValue?: number;
    heightUnit?: 'cm' | 'in';
    weightValue?: number;
    weightUnit?: 'kg' | 'lb';
    dateOfBirth?: string;
    activityLevel?: string;
    healthGoals?: string[];
    gender?: string;
    location?: string;
    referralSource?: string;
    healthReminders?: boolean;
    tipsAndInsights?: boolean;
    productUpdates?: boolean;
    step?: number;
    complete?: boolean;
}
