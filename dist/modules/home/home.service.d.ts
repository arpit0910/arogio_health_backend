import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../../database/database.service';
import { StormglassWeather } from './stormglass.weather';
export declare class HomeService {
    private readonly database;
    private readonly config;
    private readonly stormglass;
    private readonly cache;
    constructor(database: DatabaseService, config: ConfigService, stormglass: StormglassWeather);
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
        city: null;
        reason: string;
    } | {
        available: boolean;
        city: string;
        reason: string;
    }>;
}
