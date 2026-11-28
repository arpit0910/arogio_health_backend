import { categoryInput, type DirectoryKind } from '../requests/health-resources.input';
import { z } from 'zod';
export declare function workbookToCsv(buffer: Buffer): Promise<Buffer>;
export declare function readDirectoryWorkbook(buffer: Buffer, kind: DirectoryKind): Promise<{
    csv: Buffer<ArrayBufferLike>;
    categories: z.infer<typeof categoryInput>[];
}>;
