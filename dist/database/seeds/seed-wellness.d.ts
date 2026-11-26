import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
export declare function prepareWellnessSeed(): {
    id: string;
    kind: "video" | "practice";
    section: "meditation" | "yoga";
    title_en: string;
    title_hi: string;
    description_en: string;
    preparation_en: string;
    steps: {
        title_en: string;
        title_hi: string;
        instruction_en: string;
        instruction_hi: string;
        seconds: number;
    }[];
    author: string;
    videoId: string | null;
    published: boolean;
    sortOrder: number;
    durationSeconds: number | null;
}[];
export declare function seedWellness<TQuery extends PgQueryResultHKT, TSchema extends Record<string, unknown>>(db: PgDatabase<TQuery, TSchema>): Promise<{
    inserted: number;
    skipped: number;
}>;
