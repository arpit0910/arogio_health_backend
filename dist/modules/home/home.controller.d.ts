import type { Response } from 'express';
import type { RequestUser } from '../../common/auth/request-user';
import { HomeService } from './home.service';
export declare class HomeController {
    private readonly home;
    constructor(home: HomeService);
    banners(): Promise<{
        id: string;
        title: string;
        alt: string;
        route: string | null;
        updatedAt: Date;
    }[]>;
    image(id: string, response: Response): Promise<void>;
    weather(user: RequestUser): Promise<{
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
