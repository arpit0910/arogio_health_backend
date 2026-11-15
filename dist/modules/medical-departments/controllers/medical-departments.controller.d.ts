import type { Response } from 'express';
import type { RequestUser } from '../../../common/authentication/request-user';
import { MedicalDepartmentsService } from '../services/medical-departments.service';
export declare class PublicMedicalDepartmentsController {
    private readonly service;
    constructor(service: MedicalDepartmentsService);
    list(query: unknown): Promise<{
        items: {
            id: string;
            source_key: string;
            name_en: string;
            name_hi: string;
            description_en: string;
            description_hi: string;
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
        id: string;
        source_key: string;
        name_en: string;
        name_hi: string;
        description_en: string;
        description_hi: string;
        is_active: boolean;
        version: number;
        created_at: Date;
        updated_at: Date;
    }>;
}
export declare class MedicalDepartmentsAdministrationController {
    private readonly service;
    constructor(service: MedicalDepartmentsService);
    list(query: unknown): Promise<{
        items: {
            id: string;
            source_key: string;
            name_en: string;
            name_hi: string;
            description_en: string;
            description_hi: string;
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
        sample: {
            source_key: string;
            name_en: string;
            name_hi: string;
            description_en: string;
            description_hi: string;
            is_active: boolean;
        }[];
    }>;
    apply(user: RequestUser, file: Express.Multer.File | undefined, token: unknown): Promise<{
        imported: number;
        creates: number;
        updates: number;
    }>;
    detail(id: string): Promise<{
        id: string;
        source_key: string;
        name_en: string;
        name_hi: string;
        description_en: string;
        description_hi: string;
        is_active: boolean;
        version: number;
        created_at: Date;
        updated_at: Date;
    }>;
    create(user: RequestUser, body: unknown): Promise<{
        id: string;
        created_at: Date;
        updated_at: Date;
        name_en: string;
        name_hi: string;
        is_active: boolean;
        source_key: string;
        description_en: string;
        description_hi: string;
        version: number;
    }>;
    update(user: RequestUser, id: string, body: unknown): Promise<{
        id: string;
        source_key: string;
        name_en: string;
        name_hi: string;
        description_en: string;
        description_hi: string;
        is_active: boolean;
        version: number;
        created_at: Date;
        updated_at: Date;
    }>;
    remove(user: RequestUser, id: string, query: unknown): Promise<{
        deleted: boolean;
    }>;
}
