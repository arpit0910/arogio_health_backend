import { DatabaseService } from '../../database/database.service';
import { type User } from '../../database/schema';
import type { HeightUnit, WeightUnit } from '../../common/health/measurements';
export declare class UsersRepository {
    private readonly database;
    constructor(database: DatabaseService);
    findById(id: string): Promise<User | undefined>;
    updateProfile(id: string, changes: {
        profileSetup?: Record<string, unknown>;
        profileCompletedAt?: Date;
        fullName?: string;
        username?: string;
        heightValue?: number;
        heightUnit?: HeightUnit;
        weightValue?: number;
        weightUnit?: WeightUnit;
        heightCm?: number;
        weightKg?: number;
    }): Promise<User | undefined>;
}
