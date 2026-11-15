import type { RequestUser } from '../../../common/authentication/request-user';
import { SafeUserDto } from '../../authentication/responses/authentication-response.dto';
import { UpdateProfileDto } from '../requests/update-profile.dto';
import { ProfileSetupDto } from '../requests/profile-setup.dto';
import { UserAccountsService } from '../services/user-accounts.service';
export declare class UserAccountsController {
    private readonly users;
    constructor(users: UserAccountsService);
    getMe(currentUser: RequestUser): Promise<SafeUserDto>;
    updateMe(currentUser: RequestUser, input: UpdateProfileDto): Promise<SafeUserDto>;
    saveSetup(currentUser: RequestUser, input: ProfileSetupDto): Promise<SafeUserDto>;
}
