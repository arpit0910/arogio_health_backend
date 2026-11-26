import { type ArticleInput, type BankInput, type DirectoryKind } from '../requests/health-resources.input';
export declare const articleHeaders: string[];
export declare const bankHeaders: string[];
type ImportedArticle = ArticleInput & {
    record_key: string;
    created_at: Date;
    updated_at: Date;
};
type ImportedBank = BankInput & {
    record_key: string;
};
export declare function prepareImport(kind: DirectoryKind, buffer: Buffer): {
    totalRows: number;
    articles: ImportedArticle[];
    banks: ImportedBank[];
    errors: {
        row: number;
        message: string;
    }[];
};
export {};
