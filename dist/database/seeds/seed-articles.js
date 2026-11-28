"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const pg_1 = require("pg");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const schema_1 = require("../schema");
function parseCsv(input) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;
    for (let i = 0; i < input.length; i += 1) {
        const ch = input[i];
        if (inQuotes) {
            if (ch === '"') {
                if (input[i + 1] === '"') {
                    field += '"';
                    i += 1;
                }
                else {
                    inQuotes = false;
                }
            }
            else {
                field += ch;
            }
        }
        else if (ch === '"') {
            inQuotes = true;
        }
        else if (ch === ',') {
            row.push(field);
            field = '';
        }
        else if (ch === '\r') {
            if (input[i + 1] === '\n')
                i += 1;
            row.push(field);
            rows.push(row);
            row = [];
            field = '';
        }
        else if (ch === '\n') {
            row.push(field);
            rows.push(row);
            row = [];
            field = '';
        }
        else {
            field += ch;
        }
    }
    if (field.length > 0 || row.length > 0) {
        row.push(field);
        rows.push(row);
    }
    const [header, ...dataRows] = rows;
    if (!header)
        return [];
    return dataRows
        .filter((r) => r.length === header.length && r[0]?.trim())
        .map((r) => {
        const obj = {};
        header.forEach((col, idx) => {
            obj[col.trim()] = r[idx] ?? '';
        });
        return obj;
    });
}
function parseTimestamp(value) {
    const iso = value.trim().replace(' ', 'T') + 'Z';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? new Date() : d;
}
async function main() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw new Error('DATABASE_URL is required');
    }
    const csvPath = (0, node_path_1.join)(process.cwd(), 'imports', 'articles.csv');
    const raw = (0, node_fs_1.readFileSync)(csvPath, 'utf8');
    const records = parseCsv(raw);
    if (records.length === 0) {
        throw new Error(`No article records parsed from ${csvPath}`);
    }
    const pool = new pg_1.Pool({ connectionString: databaseUrl });
    const db = (0, node_postgres_1.drizzle)(pool);
    try {
        const categories = Array.from(new Set(records.map((r) => r.category.trim()).filter(Boolean)));
        for (const name of categories) {
            await db
                .insert(schema_1.healthArticleCategories)
                .values({ name })
                .onConflictDoNothing({ target: schema_1.healthArticleCategories.name });
        }
        let upserted = 0;
        for (const r of records) {
            const numId = Number.parseInt(r.id.trim(), 10);
            const recordKey = Number.isFinite(numId)
                ? `article-${String(numId).padStart(3, '0')}`
                : `article-${r.id.trim()}`;
            const createdAt = parseTimestamp(r.created_at);
            const updatedAt = parseTimestamp(r.updated_at);
            await db
                .insert(schema_1.healthArticles)
                .values({
                record_key: recordKey,
                title_en: r.title_en.trim(),
                title_hi: r.title_hi.trim(),
                excerpt_en: r.excerpt_en.trim(),
                excerpt_hi: r.excerpt_hi.trim(),
                content_en: r.content_en.trim(),
                content_hi: r.content_hi.trim(),
                category: r.category.trim(),
                author_name: r.author_name.trim() || 'Arogio Editorial Team',
                image_url: r.image_url.trim(),
                is_published: true,
                created_at: createdAt,
                updated_at: updatedAt,
            })
                .onConflictDoUpdate({
                target: schema_1.healthArticles.record_key,
                set: {
                    title_en: r.title_en.trim(),
                    title_hi: r.title_hi.trim(),
                    excerpt_en: r.excerpt_en.trim(),
                    excerpt_hi: r.excerpt_hi.trim(),
                    content_en: r.content_en.trim(),
                    content_hi: r.content_hi.trim(),
                    category: r.category.trim(),
                    author_name: r.author_name.trim() || 'Arogio Editorial Team',
                    image_url: r.image_url.trim(),
                    is_published: true,
                    updated_at: updatedAt,
                },
            });
            upserted += 1;
        }
        console.log(`Seeded ${categories.length} categories and ${upserted} health articles.`);
    }
    finally {
        await pool.end();
    }
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=seed-articles.js.map