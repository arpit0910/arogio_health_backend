import { type HospitalInput } from '../requests/hospitals.input';
export declare const hospitalHeaders: readonly ["record_key", "name_en", "name_hi", "hospital_type", "address_line1", "address_line2", "landmark", "address_hi", "city", "state", "pincode", "country_code_1", "phone_1", "country_code_2", "phone_2", "email", "website", "latitude", "longitude", "accepts_ayushman", "accepts_janaadhaar", "accepts_cghs", "accepts_esic", "rgahs_approved", "is_cashless", "nabh_accredited", "is_24_7", "cashless_schemes", "specialties", "summary_en", "summary_hi"];
export declare function prepareHospitals(file?: Express.Multer.File): Promise<{
    rows: {
        row: number;
        value: HospitalInput;
    }[];
    errors: {
        row: number;
        message: string;
    }[];
    totalRows: number;
    ignoredVerificationFlags: number;
}>;
