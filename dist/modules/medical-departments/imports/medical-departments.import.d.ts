import { type DepartmentInput } from '../requests/medical-departments.input';
export declare const departmentHeaders: string[];
export declare function prepareDepartments(file?: Express.Multer.File): Promise<{
    rows: {
        row: number;
        value: DepartmentInput;
    }[];
    errors: {
        row: number;
        message: string;
    }[];
    totalRows: number;
}>;
