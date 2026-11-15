import type { Response } from 'express';
import type { RequestUser } from '../../../common/authentication/request-user';
import { HomeDashboardService } from '../services/home-dashboard.service';
export declare class HomeDashboardController {
    private readonly home;
    constructor(home: HomeDashboardService);
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
