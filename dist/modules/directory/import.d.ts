import { type ArticleInput, type BankInput, type DirectoryKind } from './directory.input';
export declare const articleHeaders: string[];
export declare const bankHeaders: string[];
type ImportedArticle = ArticleInput & {
    source_id: string;
    created_at: Date;
    updated_at: Date;
};
type ImportedBank = BankInput & {
    source_id: string;
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
