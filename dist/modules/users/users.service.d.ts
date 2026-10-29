import { type SafeUserDto } from '../auth/dto/auth-response.dto';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import type { ProfileSetupDto } from './dto/profile-setup.dto';
import { UsersRepository } from './users.repository';
export declare class UsersService {
    private readonly repository;
    constructor(repository: UsersRepository);
    private activeUser;
    applyReferral(userId: string, code: string): Promise<SafeUserDto>;
    getMe(userId: string): Promise<SafeUserDto>;
    createProfile(userId: string, input: UpdateProfileDto): Promise<SafeUserDto>;
    updateMe(userId: string, input: UpdateProfileDto): Promise<SafeUserDto>;
    saveSetup(userId: string, input: ProfileSetupDto): Promise<SafeUserDto>;
}
