import { DatabaseService } from './database.service';
import { PasswordService } from '../modules/auth/password.service';
export declare function seedSuperAdmin(database: DatabaseService, passwords: PasswordService, environment: NodeJS.ProcessEnv): Promise<{
    id: string;
    created: boolean;
}>;
