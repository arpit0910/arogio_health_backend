import { resolve } from 'node:path';

// Both src/database (tsx) and dist/database (production) are two levels below root.
export const migrationsDirectory = resolve(__dirname, '../../database/migrations');
