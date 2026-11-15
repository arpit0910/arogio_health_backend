import { DatabaseService } from '../database.service';
import { PasswordHashingService } from '../../modules/authentication/services/password-hashing.service';
export declare function seedSuperAdmin(database: DatabaseService, passwords: PasswordHashingService, environment: NodeJS.ProcessEnv): Promise<{
    id: string;
    created: boolean;
}>;
