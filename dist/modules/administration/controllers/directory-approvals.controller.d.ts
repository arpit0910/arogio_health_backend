import type { Response } from 'express';
import type { RequestUser } from '../../../common/authentication/request-user';
import { HospitalsService } from '../../hospitals/services/hospitals.service';
import { DoctorsService } from '../../doctors/services/doctors.service';
import { HealthResourcesService } from '../../health-resources/services/health-resources.service';
import { CareDirectoryService } from '../../care-directory/services/care-directory.service';
export declare class DirectoryApprovalsController {
    private readonly hospitals;
    private readonly doctors;
    private readonly banks;
    private readonly care;
    private readonly logger;
    constructor(hospitals: HospitalsService, doctors: DoctorsService, banks: HealthResourcesService, care: CareDirectoryService);
    summary(): Promise<{
        hospitals: {
            [x: string]: number;
        } | undefined;
        doctors: {
            [x: string]: number;
        } | undefined;
        'blood-banks': {
            [x: string]: number;
        } | undefined;
    }>;
    approve(actor: RequestUser, rawKind: string, body: unknown, accept: string | undefined, response: Response): Promise<void>;
}
