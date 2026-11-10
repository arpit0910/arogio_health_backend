import { MeditationService } from './meditation.service';
export declare class MeditationController {
    private readonly meditation;
    constructor(meditation: MeditationService);
    list(query: unknown): Promise<{
        items: ({
            id: string;
            repeat: number;
            createdAt: Date;
            updatedAt: Date;
            published: boolean;
            sortOrder: number;
            title_en: string;
            title_hi: string;
            kind: "video" | "practice";
            section: "affirmations" | "meditation" | "breathing" | "grounding";
            description_en: string;
            description_hi: string;
            preparation_en: string;
            preparation_hi: string;
            author: string;
            videoId: string | null;
            durationSeconds: number | null;
            steps: import("../../database/schema").MeditationStep[];
        } | {
            createdBy: string | null;
            youtubeUrl: string;
            id: string;
            repeat: number;
            createdAt: Date;
            updatedAt: Date;
            published: boolean;
            sortOrder: number;
            title_en: string;
            title_hi: string;
            kind: "video" | "practice";
            section: "affirmations" | "meditation" | "breathing" | "grounding";
            description_en: string;
            description_hi: string;
            preparation_en: string;
            preparation_hi: string;
            author: string;
            videoId: string | null;
            durationSeconds: number | null;
            steps: import("../../database/schema").MeditationStep[];
        })[];
        page: number;
        hasNext: boolean;
        total: number;
    }>;
}
export declare class PublicMeditationController {
    private readonly meditation;
    constructor(meditation: MeditationService);
    list(query: unknown): Promise<{
        items: ({
            id: string;
            repeat: number;
            createdAt: Date;
            updatedAt: Date;
            published: boolean;
            sortOrder: number;
            title_en: string;
            title_hi: string;
            kind: "video" | "practice";
            section: "affirmations" | "meditation" | "breathing" | "grounding";
            description_en: string;
            description_hi: string;
            preparation_en: string;
            preparation_hi: string;
            author: string;
            videoId: string | null;
            durationSeconds: number | null;
            steps: import("../../database/schema").MeditationStep[];
        } | {
            createdBy: string | null;
            youtubeUrl: string;
            id: string;
            repeat: number;
            createdAt: Date;
            updatedAt: Date;
            published: boolean;
            sortOrder: number;
            title_en: string;
            title_hi: string;
            kind: "video" | "practice";
            section: "affirmations" | "meditation" | "breathing" | "grounding";
            description_en: string;
            description_hi: string;
            preparation_en: string;
            preparation_hi: string;
            author: string;
            videoId: string | null;
            durationSeconds: number | null;
            steps: import("../../database/schema").MeditationStep[];
        })[];
        page: number;
        hasNext: boolean;
        total: number;
    }>;
}
