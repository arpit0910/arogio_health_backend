"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var DatabaseResetService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseResetService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const drizzle_orm_1 = require("drizzle-orm");
const zod_1 = require("zod");
const database_service_1 = require("../../../database/database.service");
const schema_1 = require("../../../database/schema");
const database_error_1 = require("../../../common/errors/database-error");
const password_hashing_service_1 = require("../../authentication/services/password-hashing.service");
const phrase = 'RESET ALL APP DATA';
const passwordInput = zod_1.z.object({ password: zod_1.z.string().min(1).max(1024) }).strict();
const applyInput = passwordInput.extend({
    confirmation: zod_1.z.literal(phrase),
    previewToken: zod_1.z.string().max(65536),
});
let DatabaseResetService = DatabaseResetService_1 = class DatabaseResetService {
    database;
    passwords;
    config;
    logger = new common_1.Logger(DatabaseResetService_1.name);
    constructor(database, passwords, config) {
        this.database = database;
        this.passwords = passwords;
        this.config = config;
    }
    parse(schema, body) {
        const result = schema.safeParse(body);
        if (!result.success)
            throw new common_1.BadRequestException('Provide your password and the exact reset confirmation.');
        return result.data;
    }
    async authenticate(db, actor, password) {
        const [user] = await db.select().from(schema_1.userAccounts).where((0, drizzle_orm_1.eq)(schema_1.userAccounts.id, actor)).limit(1);
        if (user?.role !== 'super_admin' ||
            user.status !== 'active' ||
            !(await this.passwords.verify(user.passwordHash, password)))
            throw new common_1.UnauthorizedException('Your current super-admin password is required.');
    }
    async inventory(db) {
        const catalog = JSON.parse((0, node_fs_1.readFileSync)((0, node_path_1.join)(__dirname, '../../../../database/table-catalog.json'), 'utf8'));
        const allowed = new Set(catalog.flatMap((entry) => [entry.table, entry.previousTable].filter((name) => Boolean(name))));
        const result = await db.execute((0, drizzle_orm_1.sql) `select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name`);
        const names = result.rows.map((row) => String(row.table_name));
        if (!names.length || names.some((name) => !allowed.has(name)))
            throw new common_1.ConflictException('Unrecognized database tables. Review the table catalog before resetting.');
        const identity = await db.execute((0, drizzle_orm_1.sql) `select current_database() as name`);
        const tables = [];
        for (const name of names) {
            const count = await db.execute(drizzle_orm_1.sql.raw(`select count(*)::text as records from ${this.identifier(name)}`));
            tables.push({ name, records: String(count.rows[0]?.records) });
        }
        return { database: String(identity.rows[0]?.name), tables };
    }
    identifier(name) {
        return `"public"."${name.replace(/"/g, '""')}"`;
    }
    signature(value) {
        return (0, node_crypto_1.createHmac)('sha256', this.config.getOrThrow('JWT_ACCESS_SECRET'))
            .update('database-reset-v1:' + value)
            .digest('hex');
    }
    targetUrl() {
        return this.config.get('DATABASE_URL') || 'local';
    }
    fingerprint(inventory) {
        return this.signature(JSON.stringify({ target: this.targetUrl(), inventory }));
    }
    async preview(actor, body) {
        const { password } = this.parse(passwordInput, body);
        await this.authenticate(this.database.db, actor, password);
        const inventory = await this.inventory(this.database.db);
        const expiresAt = Date.now() + 10 * 60 * 1000;
        const payload = Buffer.from(JSON.stringify({ actor, expiresAt, fingerprint: this.fingerprint(inventory) })).toString('base64url');
        const rawUrl = this.config.get('DATABASE_URL');
        let host = 'localhost';
        if (rawUrl) {
            try {
                host = new URL(rawUrl).hostname;
            }
            catch {
                host = 'localhost';
            }
        }
        return {
            ...inventory,
            host,
            environment: this.config.get('NODE_ENV'),
            confirmation: phrase,
            expiresAt,
            previewToken: payload + '.' + this.signature(payload),
        };
    }
    async apply(actor, body) {
        const input = this.parse(applyInput, body);
        const [payload = '', signature = ''] = input.previewToken.split('.');
        const expected = this.signature(payload);
        if (input.previewToken.split('.').length !== 2 ||
            !/^[a-f0-9]{64}$/.test(signature) ||
            !(0, node_crypto_1.timingSafeEqual)(Buffer.from(signature), Buffer.from(expected)))
            throw new common_1.BadRequestException('Invalid reset preview. Review the database again.');
        let challenge;
        try {
            challenge = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        }
        catch {
            throw new common_1.BadRequestException('Invalid reset preview.');
        }
        if (challenge.actor !== actor ||
            !Number.isFinite(challenge.expiresAt) ||
            challenge.expiresAt < Date.now())
            throw new common_1.BadRequestException('Reset preview expired. Review the database again.');
        const result = await this.database.db
            .transaction(async (tx) => {
            await tx.execute((0, drizzle_orm_1.sql) `set local lock_timeout = '10s'`);
            await tx.execute((0, drizzle_orm_1.sql) `set local statement_timeout = '60s'`);
            const before = await this.inventory(tx);
            const identifiers = before.tables.map((table) => this.identifier(table.name)).join(', ');
            await tx.execute(drizzle_orm_1.sql.raw(`LOCK TABLE ${identifiers} IN ACCESS EXCLUSIVE MODE`));
            await this.authenticate(tx, actor, input.password);
            const locked = await this.inventory(tx);
            if (challenge.expiresAt < Date.now())
                throw new common_1.BadRequestException('Reset preview expired. Review the database again.');
            if (this.fingerprint(locked) !== challenge.fingerprint)
                throw new common_1.ConflictException('Database records changed. Review the database again before resetting.');
            await tx.execute(drizzle_orm_1.sql.raw(`TRUNCATE TABLE ${identifiers} RESTART IDENTITY`));
            const after = await this.inventory(tx);
            if (after.tables.some((table) => table.records !== '0'))
                throw new common_1.ConflictException('Reset verification failed. No changes were committed.');
            return { reset: true, tableCount: after.tables.length, remainingRecords: 0 };
        })
            .catch((error) => {
            if (['0A000', '55P03', '40P01', '57014'].includes((0, database_error_1.getDatabaseErrorCode)(error) ?? ''))
                throw new common_1.ConflictException('The database is busy or has external dependencies. No reset was committed. Review the database and try again.');
            throw error;
        });
        this.logger.warn('Application database reset completed; all app records and administrator sessions removed.');
        return result;
    }
};
exports.DatabaseResetService = DatabaseResetService;
exports.DatabaseResetService = DatabaseResetService = DatabaseResetService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        password_hashing_service_1.PasswordHashingService,
        config_1.ConfigService])
], DatabaseResetService);
//# sourceMappingURL=database-reset.service.js.map