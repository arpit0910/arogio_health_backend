import { CareService } from '../care/care.service';
export declare class DiscoveryController {
    private readonly care;
    constructor(care: CareService);
    discovery(): Promise<{
        coverage: string;
        hospitals: {
            status: "available";
            items: ({
                name: string;
                id: string;
                updatedAt: Date;
                published: boolean;
                city: string;
                phone: string | null;
                kind: string;
                sourceKey: string;
                nameHi: string;
                address: string;
                addressHi: string;
                sourceUrl: string;
                details: import("../../database/schema").CareDetails;
                reviewedAt: Date | null;
                reviewedBy: string | null;
                reviewEvidence: string | null;
            } | {
                verification: string;
                freshnessDays: number;
                reviewedBy: undefined;
                reviewEvidence: undefined;
                name: string;
                id: string;
                updatedAt: Date;
                published: boolean;
                city: string;
                phone: string | null;
                kind: string;
                sourceKey: string;
                nameHi: string;
                address: string;
                addressHi: string;
                sourceUrl: string;
                details: import("../../database/schema").CareDetails;
                reviewedAt: Date | null;
            })[];
        } | {
            status: "unavailable";
            items: never[];
        };
        doctors: {
            status: "available";
            items: ({
                name: string;
                id: string;
                updatedAt: Date;
                published: boolean;
                city: string;
                phone: string | null;
                kind: string;
                sourceKey: string;
                nameHi: string;
                address: string;
                addressHi: string;
                sourceUrl: string;
                details: import("../../database/schema").CareDetails;
                reviewedAt: Date | null;
                reviewedBy: string | null;
                reviewEvidence: string | null;
            } | {
                verification: string;
                freshnessDays: number;
                reviewedBy: undefined;
                reviewEvidence: undefined;
                name: string;
                id: string;
                updatedAt: Date;
                published: boolean;
                city: string;
                phone: string | null;
                kind: string;
                sourceKey: string;
                nameHi: string;
                address: string;
                addressHi: string;
                sourceUrl: string;
                details: import("../../database/schema").CareDetails;
                reviewedAt: Date | null;
            })[];
        } | {
            status: "unavailable";
            items: never[];
        };
        availability: string;
    }>;
}
