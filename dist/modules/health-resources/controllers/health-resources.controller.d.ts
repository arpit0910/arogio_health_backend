import { HealthResourcesService } from '../services/health-resources.service';
export declare class HealthResourcesController {
    private readonly directory;
    constructor(directory: HealthResourcesService);
    articles(query: unknown): Promise<{
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
    categories(): Promise<{
        count: number;
        custom_image_url?: string | undefined;
        name: string;
        name_hi: string;
        description: string;
        image_url: string;
    }[]>;
    article(id: string): Promise<{
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
    banks(query: unknown): Promise<{
        items: {
            adminStatus?: {
                active: boolean;
                approved: boolean;
                missingFields: string[];
                complete: boolean;
                reviewStatus: string;
                visibility: string;
            } | undefined;
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
        }[];
        page: number;
        hasNext: boolean;
        missingCoordinates: number;
        summary?: {
            [x: string]: number;
        } | undefined;
        total?: number | undefined;
    }>;
    nearby(body: unknown): Promise<{
        items: {
            distanceKm: number;
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
        }[];
        page: number;
        hasNext: boolean;
        missingCoordinates: number;
        radiusKm: number;
        distanceType: string;
    }>;
}
