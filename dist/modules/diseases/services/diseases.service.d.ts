import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../../../database/database.service';
export declare class DiseasesService {
    private readonly database;
    private readonly config;
    constructor(database: DatabaseService, config: ConfigService);
    private parse;
    list(query: unknown, admin?: boolean): Promise<{
        items: {
            department: {
                id: string;
                name_en: string;
                name_hi: string;
                is_active: boolean;
            };
            id: string;
            record_key: string;
            name_en: string;
            name_hi: string;
            description_en: string;
            description_hi: string;
            symptoms_en: string;
            symptoms_hi: string;
            precautions_en: string;
            precautions_hi: string;
            icon: string;
            department_id: string;
            is_active: boolean;
            version: number;
            created_at: Date;
            updated_at: Date;
        }[];
        total: number;
        page: number;
        hasNext: boolean;
    }>;
    detail(id: string, admin?: boolean): Promise<{
        department: {
            id: string;
            name_en: string;
            name_hi: string;
            is_active: boolean;
        };
        id: string;
        record_key: string;
        name_en: string;
        name_hi: string;
        description_en: string;
        description_hi: string;
        symptoms_en: string;
        symptoms_hi: string;
        precautions_en: string;
        precautions_hi: string;
        icon: string;
        department_id: string;
        is_active: boolean;
        version: number;
        created_at: Date;
        updated_at: Date;
    }>;
    private audit;
    private write;
    create(actorId: string, body: unknown): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        record_key: string;
        name_en: string;
        name_hi: string;
        is_active: boolean;
        description_en: string;
        description_hi: string;
        icon: string;
        version: number;
        symptoms_en: string;
        symptoms_hi: string;
        precautions_en: string;
        precautions_hi: string;
        department_id: string;
    }>;
    update(actorId: string, id: string, body: unknown): Promise<{
        id: string;
        record_key: string;
        name_en: string;
        name_hi: string;
        description_en: string;
        description_hi: string;
        symptoms_en: string;
        symptoms_hi: string;
        precautions_en: string;
        precautions_hi: string;
        icon: string;
        department_id: string;
        is_active: boolean;
        version: number;
        created_at: Date;
        updated_at: Date;
    }>;
    remove(actorId: string, id: string, query: unknown): Promise<{
        deleted: boolean;
    }>;
    private prepared;
    private plan;
    private sign;
    preview(actorId: string, file?: Express.Multer.File): Promise<{
        sample: {
            department_name_en: string | undefined;
            name_en: string;
            department_id: string;
            record_key: string;
            name_hi: string;
            description_en: string;
            description_hi: string;
            is_active: boolean;
        }[];
        expiresAt: string;
        previewToken: string | null;
        totalRows: number;
        creates: number;
        updates: number;
        activeRows: number;
        errorCount: number;
        errors: {
            row: number;
            message: string;
        }[];
    }>;
    apply(actorId: string, file: Express.Multer.File | undefined, token: unknown): Promise<{
        imported: number;
        creates: number;
        updates: number;
    }>;
}
