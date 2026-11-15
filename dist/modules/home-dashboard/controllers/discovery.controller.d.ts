import { CareDirectoryService } from '../../care-directory/services/care-directory.service';
export declare class DiscoveryController {
    private readonly care;
    constructor(care: CareDirectoryService);
    discovery(): Promise<{
        coverage: string;
        hospitals: {
            status: "available";
            items: ({
                name: string;
                id: string;
                updatedAt: Date;
                city: string;
                phone: string | null;
                sourceKey: string;
                kind: string;
                nameHi: string;
                address: string;
                addressHi: string;
                sourceUrl: string;
                details: import("../../../database/schema").CareDetails;
                published: boolean;
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
                city: string;
                phone: string | null;
                sourceKey: string;
                kind: string;
                nameHi: string;
                address: string;
                addressHi: string;
                sourceUrl: string;
                details: import("../../../database/schema").CareDetails;
                published: boolean;
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
                city: string;
                phone: string | null;
                sourceKey: string;
                kind: string;
                nameHi: string;
                address: string;
                addressHi: string;
                sourceUrl: string;
                details: import("../../../database/schema").CareDetails;
                published: boolean;
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
                city: string;
                phone: string | null;
                sourceKey: string;
                kind: string;
                nameHi: string;
                address: string;
                addressHi: string;
                sourceUrl: string;
                details: import("../../../database/schema").CareDetails;
                published: boolean;
                reviewedAt: Date | null;
            })[];
        } | {
            status: "unavailable";
            items: never[];
        };
        availability: string;
    }>;
}
