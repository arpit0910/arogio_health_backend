"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const migrator_1 = require("drizzle-orm/node-postgres/migrator");
const pg_1 = require("pg");
async function main() {
    if (!process.env.DATABASE_URL)
        throw new Error('DATABASE_URL is required');
    const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
    try {
        await (0, migrator_1.migrate)((0, node_postgres_1.drizzle)(pool), { migrationsFolder: './drizzle' });
    }
    finally {
        await pool.end();
    }
}
void main();
//# sourceMappingURL=migrate.js.map