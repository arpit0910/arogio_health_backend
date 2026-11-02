import { type InferInsertModel } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { authSessions, type User } from '../../database/schema';
import type { HeightUnit, WeightUnit } from '../../common/health/measurements';
type NewSession = InferInsertModel<typeof authSessions> & {
    id: string;
    userId: string;
    familyId: string;
};
export type RotationResult = {
    kind: 'rotated';
    userId: string;
    sessionId: string;
} | {
    kind: 'invalid' | 'expired' | 'reused' | 'disabled';
};
export declare class AuthRepository {
    private readonly database;
    constructor(database: DatabaseService);
    isAccessSessionActive(userId: string, sessionId: string): Promise<boolean>;
    restoreDeletedAccount(id: string): Promise<User | undefined>;
    findUserByEmail(email: string): Promise<User | undefined>;
    findUserByReferralCode(code: string): Promise<User | undefined>;
    private retryReferralCollision;
    findUserById(id: string): Promise<User | undefined>;
    createPasswordUser(input: {
        email: string;
        passwordHash: string;
        referredByUserId?: string;
        fullName?: string;
        heightValue?: number;
        heightUnit?: HeightUnit;
        weightValue?: number;
        weightUnit?: WeightUnit;
        heightCm?: number;
        weightKg?: number;
    }): Promise<User>;
    findGoogleUser(subject: string): Promise<User | undefined>;
    createGoogleUser(input: {
        subject: string;
        referredByUserId?: string;
        email: string | null;
        fullName: string | null;
        emailVerified: boolean;
    }): Promise<User>;
    createSession(session: NewSession): Promise<void>;
    rotateSession(input: {
        currentTokenHash: string;
        replacement: NewSession;
        now: Date;
    }): Promise<RotationResult>;
    revokeSession(tokenHash: string, now: Date): Promise<void>;
}
export {};
