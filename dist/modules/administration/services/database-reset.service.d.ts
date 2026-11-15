import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../../../database/database.service';
import { PasswordHashingService } from '../../authentication/services/password-hashing.service';
export declare class DatabaseResetService {
    private readonly database;
    private readonly passwords;
    private readonly config;
    private readonly logger;
    constructor(database: DatabaseService, passwords: PasswordHashingService, config: ConfigService);
    private parse;
    private authenticate;
    private inventory;
    private identifier;
    private signature;
    private fingerprint;
    preview(actor: string, body: unknown): Promise<{
        host: string;
        environment: string | undefined;
        confirmation: string;
        expiresAt: number;
        previewToken: string;
        database: string;
        tables: {
            name: string;
            records: string;
        }[];
    }>;
    apply(actor: string, body: unknown): Promise<{
        reset: boolean;
        tableCount: number;
        remainingRecords: number;
    }>;
}
