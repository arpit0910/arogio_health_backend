import { DeleteAccountDto } from './dto/delete-account.dto';
import { ApplyReferralDto } from './dto/referral.dto';
import type { RequestUser } from '../../common/auth/request-user';
import { SafeUserDto } from '../auth/dto/auth-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';
export declare class ProfileController {
    private readonly profiles;
    constructor(profiles: UsersService);
    applyReferral(user: RequestUser, input: ApplyReferralDto): Promise<SafeUserDto>;
    deleteAccount(user: RequestUser, input: DeleteAccountDto): Promise<{
        deletionRequestedAt: string;
        recoverableUntil: string;
    }>;
    view(user: RequestUser): Promise<SafeUserDto>;
    create(user: RequestUser, input: UpdateProfileDto): Promise<SafeUserDto>;
    update(user: RequestUser, input: UpdateProfileDto): Promise<SafeUserDto>;
}
