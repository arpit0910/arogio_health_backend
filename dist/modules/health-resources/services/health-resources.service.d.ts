import { DatabaseService } from '../../../database/database.service';
import { type DirectoryKind } from '../requests/health-resources.input';
export declare class HealthResourcesService {
    private readonly database;
    constructor(database: DatabaseService);
    private parse;
    kind(value: string): DirectoryKind;
    listArticles(query: unknown, admin?: boolean): Promise<{
        items: ({
            id: string;
            title_en: string;
            title_hi: string;
            excerpt_en: string;
            excerpt_hi: string;
            reading_minutes_en: number;
            reading_minutes_hi: number;
            category: string;
            image_url: string;
            thumbnailRevision: string | null;
            author_name: string;
            is_published: boolean;
            created_at: Date;
            updated_at: Date;
        } & {
            thumbnail_url: string;
            category_hi: string;
        })[];
        page: number;
        hasNext: boolean;
        categories: string[];
        categoryDetails: {
            count: number;
            custom_image_url?: string | undefined;
            name: string;
            name_hi: string;
            description: string;
            image_url: string;
        }[];
        total: number;
    }>;
    private withThumbnail;
    categories(admin?: boolean): Promise<{
        count: number;
        custom_image_url?: string | undefined;
        name: string;
        name_hi: string;
        description: string;
        image_url: string;
    }[]>;
    saveCategory(body: unknown): Promise<{
        saved: boolean;
    }>;
    article(id: string, admin?: boolean): Promise<{
        content_en: string;
        content_hi: string;
        id: string;
        title_en: string;
        title_hi: string;
        excerpt_en: string;
        excerpt_hi: string;
        reading_minutes_en: number;
        reading_minutes_hi: number;
        category: string;
        image_url: string;
        thumbnailRevision: string | null;
        author_name: string;
        is_published: boolean;
        created_at: Date;
        updated_at: Date;
    } & {
        thumbnail_url: string;
        category_hi: string;
    }>;
    articleThumbnail(id: string, admin?: boolean): Promise<{
        image_data: Buffer<ArrayBufferLike>;
        image_revision: string;
    }>;
    saveArticleThumbnail(id: string, file?: Express.Multer.File): Promise<{
        revision: `${string}-${string}-${string}-${string}-${string}`;
    }>;
    removeArticleThumbnail(id: string): Promise<{
        removed: boolean;
    }>;
    private bankFilters;
    listBanks(query: unknown, admin?: boolean, reviewedOnly?: boolean): Promise<{
        items: {
            adminStatus?: {
                active: boolean;
                approved: boolean;
                missingFields: string[];
                complete: boolean;
                reviewStatus: string;
                visibility: string;
            } | undefined;
            email: string | null;
            id: string;
            created_at: Date;
            updated_at: Date;
            record_key: string;
            name_en: string;
            name_hi: string;
            city: string;
            state: string;
            pincode: string | null;
            landmark: string | null;
            address_en: string;
            address_hi: string;
            country_code: string;
            phone: string | null;
            emergency_country_code: string;
            emergency_phone: string | null;
            website: string | null;
            image_url: string;
            image_revision: string | null;
            is_verified: boolean;
            verified_at: Date | null;
            is_24_7: boolean;
            is_government: boolean;
            component_facility: boolean;
            apheresis_facility: boolean;
            available_blood_groups: string[];
            latitude: number | null;
            longitude: number | null;
            is_active: boolean;
        }[];
        page: number;
        hasNext: boolean;
        missingCoordinates: number;
        summary?: {
            [x: string]: number;
        } | undefined;
        total?: number | undefined;
    }>;
    private bankSearch;
    nearby(body: unknown, reviewedOnly?: boolean): Promise<{
        items: {
            distanceKm: number;
            email: string | null;
            id: string;
            created_at: Date;
            updated_at: Date;
            record_key: string;
            name_en: string;
            name_hi: string;
            city: string;
            state: string;
            pincode: string | null;
            landmark: string | null;
            address_en: string;
            address_hi: string;
            country_code: string;
            phone: string | null;
            emergency_country_code: string;
            emergency_phone: string | null;
            website: string | null;
            image_url: string;
            image_revision: string | null;
            is_verified: boolean;
            verified_at: Date | null;
            is_24_7: boolean;
            is_government: boolean;
            component_facility: boolean;
            apheresis_facility: boolean;
            available_blood_groups: string[];
            latitude: number | null;
            longitude: number | null;
            is_active: boolean;
        }[];
        page: number;
        hasNext: boolean;
        missingCoordinates: number;
        radiusKm: number;
        distanceType: string;
    }>;
    adminList(kind: DirectoryKind, query: unknown): Promise<{
        items: ({
            id: string;
            title_en: string;
            title_hi: string;
            excerpt_en: string;
            excerpt_hi: string;
            reading_minutes_en: number;
            reading_minutes_hi: number;
            category: string;
            image_url: string;
            thumbnailRevision: string | null;
            author_name: string;
            is_published: boolean;
            created_at: Date;
            updated_at: Date;
        } & {
            thumbnail_url: string;
            category_hi: string;
        })[];
        page: number;
        hasNext: boolean;
        categories: string[];
        categoryDetails: {
            count: number;
            custom_image_url?: string | undefined;
            name: string;
            name_hi: string;
            description: string;
            image_url: string;
        }[];
        total: number;
    } | {
        items: {
            adminStatus?: {
                active: boolean;
                approved: boolean;
                missingFields: string[];
                complete: boolean;
                reviewStatus: string;
                visibility: string;
            } | undefined;
            email: string | null;
            id: string;
            created_at: Date;
            updated_at: Date;
            record_key: string;
            name_en: string;
            name_hi: string;
            city: string;
            state: string;
            pincode: string | null;
            landmark: string | null;
            address_en: string;
            address_hi: string;
            country_code: string;
            phone: string | null;
            emergency_country_code: string;
            emergency_phone: string | null;
            website: string | null;
            image_url: string;
            image_revision: string | null;
            is_verified: boolean;
            verified_at: Date | null;
            is_24_7: boolean;
            is_government: boolean;
            component_facility: boolean;
            apheresis_facility: boolean;
            available_blood_groups: string[];
            latitude: number | null;
            longitude: number | null;
            is_active: boolean;
        }[];
        page: number;
        hasNext: boolean;
        missingCoordinates: number;
        summary?: {
            [x: string]: number;
        } | undefined;
        total?: number | undefined;
    }>;
    bank(id: string): Promise<Omit<{
        id: string;
        record_key: string;
        name_en: string;
        name_hi: string;
        city: string;
        state: string;
        pincode: string | null;
        landmark: string | null;
        address_en: string;
        address_hi: string;
        country_code: string;
        phone: string | null;
        emergency_country_code: string;
        emergency_phone: string | null;
        email: string | null;
        website: string | null;
        image_url: string;
        image_data: Buffer<ArrayBufferLike> | null;
        image_revision: string | null;
        is_verified: boolean;
        verified_at: Date | null;
        is_24_7: boolean;
        is_government: boolean;
        component_facility: boolean;
        apheresis_facility: boolean;
        available_blood_groups: string[];
        latitude: number | null;
        longitude: number | null;
        is_active: boolean;
        created_at: Date;
        updated_at: Date;
    }, "image_data">>;
    bankImage(id: string): Promise<{
        image_data: Buffer<ArrayBufferLike> | null;
        image_revision: string | null;
    }>;
    save(kind: DirectoryKind, id: string | null, body: unknown): Promise<{
        id: string;
        record_key: string;
        title_en: string;
        title_hi: string;
        excerpt_en: string;
        excerpt_hi: string;
        content_en: string;
        content_hi: string;
        category: string;
        image_url: string;
        author_name: string;
        is_published: boolean;
        created_at: Date;
        updated_at: Date;
    } | {
        id: string;
        record_key: string;
        name_en: string;
        name_hi: string;
        city: string;
        state: string;
        pincode: string | null;
        landmark: string | null;
        address_en: string;
        address_hi: string;
        country_code: string;
        phone: string | null;
        emergency_country_code: string;
        emergency_phone: string | null;
        email: string | null;
        website: string | null;
        image_url: string;
        image_data: Buffer<ArrayBufferLike> | null;
        image_revision: string | null;
        is_verified: boolean;
        verified_at: Date | null;
        is_24_7: boolean;
        is_government: boolean;
        component_facility: boolean;
        apheresis_facility: boolean;
        available_blood_groups: string[];
        latitude: number | null;
        longitude: number | null;
        is_active: boolean;
        created_at: Date;
        updated_at: Date;
    }>;
    setArticleVisibility(id: string, body: unknown, actorId: string): Promise<{
        title: string;
        visible: boolean;
        updatedAt: Date;
    }>;
    setBloodBankVisibility(id: string, body: unknown, actorId: string): Promise<{
        visible: boolean;
        updatedAt: Date;
    }>;
    remove(kind: DirectoryKind, id: string): Promise<{
        deleted: boolean;
    }>;
    private prepared;
    preview(kind: DirectoryKind, file?: Express.Multer.File): Promise<{
        totalRows: number;
        validRows: number;
        errorCount: number;
        errors: {
            row: number;
            message: string;
        }[];
        creates: number;
        updates: number;
        publishedRows: number;
        categoryCount: number;
        thumbnailFallbacks: number;
        missingCoordinates: number;
        sample: {
            record_key: string;
            title: string;
        }[];
    }>;
    import(kind: DirectoryKind, file?: Express.Multer.File): Promise<{
        imported: number;
        categories: number;
        missingCoordinates: number;
    }>;
}
