import type { Response } from 'express';
import type { RequestUser } from '../../../common/authentication/request-user';
import { DiseasesService } from '../services/diseases.service';
export declare class PublicDiseasesController {
    private readonly service;
    constructor(service: DiseasesService);
    list(query: unknown): Promise<{
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
    detail(id: string): Promise<{
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
}
export declare class DiseasesAdministrationController {
    private readonly service;
    constructor(service: DiseasesService);
    list(query: unknown): Promise<{
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
    template(format: string | undefined, response: Response): Promise<void>;
    preview(user: RequestUser, file?: Express.Multer.File): Promise<{
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
    apply(user: RequestUser, file: Express.Multer.File | undefined, token: unknown): Promise<{
        imported: number;
        creates: number;
        updates: number;
    }>;
    detail(id: string): Promise<{
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
    create(user: RequestUser, body: unknown): Promise<{
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
    update(user: RequestUser, id: string, body: unknown): Promise<{
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
    remove(user: RequestUser, id: string, query: unknown): Promise<{
        deleted: boolean;
    }>;
}
