import { ConfigService } from '@nestjs/config';
export declare class StormglassWeather {
    private readonly config;
    constructor(config: ConfigService);
    private load;
    private save;
    private reading;
    weather(city: string): Promise<{
        available: true;
        city: string;
        temperature: number;
        condition: string;
        observedAt: string;
        forecast: boolean;
        provider: string;
    } | {
        available: false;
        city: string;
        reason: string;
    }>;
}
