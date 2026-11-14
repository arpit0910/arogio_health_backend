import { OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
export declare class DatabaseService implements OnApplicationShutdown {
    private readonly pool;
    readonly db: NodePgDatabase<typeof schema>;
    constructor(config: ConfigService);
    ping(): Promise<void>;
    onApplicationShutdown(): Promise<void>;
}
