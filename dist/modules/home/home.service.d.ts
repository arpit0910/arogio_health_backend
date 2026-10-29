import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../../database/database.service';
export declare class HomeService {
    private readonly database;
    private readonly config;
    private readonly cache;
    constructor(database: DatabaseService, config: ConfigService);
    banners(): Promise<{
        id: string;
        title: string;
        alt: string;
        route: string | null;
        updatedAt: Date;
    }[]>;
    image(id: string): Promise<{
        image: Buffer<ArrayBufferLike>;
    }>;
    weather(userId: string): Promise<{
        available: true;
        city: string;
        temperature: number;
        condition: string;
        observedAt: string;
    } | {
        available: boolean;
        city: string | null;
    }>;
}
