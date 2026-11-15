import { type SafeUserDto } from '../../authentication/responses/authentication-response.dto';
import type { UpdateProfileDto } from '../requests/update-profile.dto';
import type { ProfileSetupDto } from '../requests/profile-setup.dto';
import { UserAccountsRepository } from '../repositories/user-accounts.repository';
export declare class UserAccountsService {
    private readonly repository;
    constructor(repository: UserAccountsRepository);
    private activeUser;
    applyReferral(userId: string, code: string): Promise<SafeUserDto>;
    deleteAccount(userId: string, confirmed: boolean): Promise<{
        deletionRequestedAt: string;
        recoverableUntil: string;
    }>;
    getMe(userId: string): Promise<SafeUserDto>;
    createProfile(userId: string, input: UpdateProfileDto): Promise<SafeUserDto>;
    updateMe(userId: string, input: UpdateProfileDto): Promise<SafeUserDto>;
    saveSetup(userId: string, input: ProfileSetupDto): Promise<SafeUserDto>;
}
