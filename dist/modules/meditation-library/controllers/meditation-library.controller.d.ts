import { MeditationLibraryService } from '../services/meditation-library.service';
export declare class MeditationLibraryController {
    private readonly meditation;
    constructor(meditation: MeditationLibraryService);
    list(query: unknown): Promise<{
        items: ({
            id: string;
            repeat: number;
            createdAt: Date;
            updatedAt: Date;
            kind: "video" | "practice";
            published: boolean;
            title_en: string;
            title_hi: string;
            sortOrder: number;
            section: "affirmations" | "meditation" | "breathing" | "grounding";
            description_en: string;
            description_hi: string;
            preparation_en: string;
            preparation_hi: string;
            author: string;
            videoId: string | null;
            durationSeconds: number | null;
            steps: import("../../../database/schema").MeditationStep[];
        } | {
            createdBy: string | null;
            youtubeUrl: string;
            id: string;
            repeat: number;
            createdAt: Date;
            updatedAt: Date;
            kind: "video" | "practice";
            published: boolean;
            title_en: string;
            title_hi: string;
            sortOrder: number;
            section: "affirmations" | "meditation" | "breathing" | "grounding";
            description_en: string;
            description_hi: string;
            preparation_en: string;
            preparation_hi: string;
            author: string;
            videoId: string | null;
            durationSeconds: number | null;
            steps: import("../../../database/schema").MeditationStep[];
        })[];
        page: number;
        hasNext: boolean;
        total: number;
    }>;
}
export declare class PublicMeditationLibraryController {
    private readonly meditation;
    constructor(meditation: MeditationLibraryService);
    list(query: unknown): Promise<{
        items: ({
            id: string;
            repeat: number;
            createdAt: Date;
            updatedAt: Date;
            kind: "video" | "practice";
            published: boolean;
            title_en: string;
            title_hi: string;
            sortOrder: number;
            section: "affirmations" | "meditation" | "breathing" | "grounding";
            description_en: string;
            description_hi: string;
            preparation_en: string;
            preparation_hi: string;
            author: string;
            videoId: string | null;
            durationSeconds: number | null;
            steps: import("../../../database/schema").MeditationStep[];
        } | {
            createdBy: string | null;
            youtubeUrl: string;
            id: string;
            repeat: number;
            createdAt: Date;
            updatedAt: Date;
            kind: "video" | "practice";
            published: boolean;
            title_en: string;
            title_hi: string;
            sortOrder: number;
            section: "affirmations" | "meditation" | "breathing" | "grounding";
            description_en: string;
            description_hi: string;
            preparation_en: string;
            preparation_hi: string;
            author: string;
            videoId: string | null;
            durationSeconds: number | null;
            steps: import("../../../database/schema").MeditationStep[];
        })[];
        page: number;
        hasNext: boolean;
        total: number;
    }>;
}
