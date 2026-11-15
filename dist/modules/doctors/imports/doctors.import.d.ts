import { type DoctorInput } from '../requests/doctors.input';
export declare const doctorHeaders: readonly ["source_key", "name_en", "name_hi", "registration_number", "medical_council", "qualifications", "experience_years", "consultation_fee", "languages", "address_line1", "address_line2", "landmark", "address_hi", "city", "state", "pincode", "country_code_1", "phone_1", "country_code_2", "phone_2", "email", "website", "source_url", "latitude", "longitude", "summary_en", "summary_hi", "department_source_keys", "hospital_source_keys", "schedule_days", "schedule_start", "schedule_end", "consultation_mode", "hospital_role", "availability", "hospital_consultation_fee"];
export type DoctorMasters = {
    departments: {
        id: string;
        source_key: string;
        name_en: string;
    }[];
    hospitals: {
        id: string;
        source_key: string;
        name_en: string;
        city: string;
    }[];
};
export declare function prepareDoctors(file: Express.Multer.File | undefined, masters: DoctorMasters): Promise<{
    rows: {
        row: number;
        value: DoctorInput;
    }[];
    errors: {
        row: number;
        message: string;
    }[];
    totalRows: number;
    ignoredVerificationFlags: number;
    ignoredMetadataFields: number;
}>;
