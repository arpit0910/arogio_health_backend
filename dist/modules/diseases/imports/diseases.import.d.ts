import { type DiseaseInput } from '../requests/diseases.input';
export declare const diseaseHeaders: string[];
export type DepartmentReference = {
    id: string;
    record_key: string;
    name_en: string;
};
export declare function prepareDiseases(file: Express.Multer.File | undefined, departments: DepartmentReference[]): Promise<{
    rows: {
        row: number;
        value: DiseaseInput;
    }[];
    errors: {
        row: number;
        message: string;
    }[];
    totalRows: number;
}>;
