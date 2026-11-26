export declare const generalDirectoryAliases: Record<string, string>;
export declare function selectDirectoryColumns(rows: Record<string, string>[], supported: readonly string[], aliases: Record<string, string>): Record<string, string>[];
export declare function directoryImportKey(value: string, kind: 'doctor' | 'hospital'): string;
