import { DeleteAccountDto } from '../requests/delete-account.dto';
import { ApplyReferralDto } from '../requests/referral.dto';
import type { RequestUser } from '../../../common/authentication/request-user';
import { SafeUserDto } from '../../authentication/responses/authentication-response.dto';
import { UpdateProfileDto } from '../requests/update-profile.dto';
import { UserAccountsService } from '../services/user-accounts.service';
export declare class ProfileController {
    private readonly profiles;
    constructor(profiles: UserAccountsService);
    applyReferral(user: RequestUser, input: ApplyReferralDto): Promise<SafeUserDto>;
    deleteAccount(user: RequestUser, input: DeleteAccountDto): Promise<{
        deletionRequestedAt: string;
        recoverableUntil: string;
    }>;
    view(user: RequestUser): Promise<SafeUserDto>;
    create(user: RequestUser, input: UpdateProfileDto): Promise<SafeUserDto>;
    update(user: RequestUser, input: UpdateProfileDto): Promise<SafeUserDto>;
}
