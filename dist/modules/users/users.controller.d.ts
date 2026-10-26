import type { RequestUser } from '../../common/auth/request-user';
import { SafeUserDto } from '../auth/dto/auth-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileSetupDto } from './dto/profile-setup.dto';
import { UsersService } from './users.service';
export declare class UsersController {
    private readonly users;
    constructor(users: UsersService);
    getMe(currentUser: RequestUser): Promise<SafeUserDto>;
    updateMe(currentUser: RequestUser, input: UpdateProfileDto): Promise<SafeUserDto>;
    saveSetup(currentUser: RequestUser, input: ProfileSetupDto): Promise<SafeUserDto>;
}
