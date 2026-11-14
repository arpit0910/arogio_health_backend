"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedSuperAdmin = seedSuperAdmin;
const core_1 = require("@nestjs/core");
const drizzle_orm_1 = require("drizzle-orm");
const zod_1 = require("zod");
const app_module_1 = require("../app.module");
const database_service_1 = require("./database.service");
const schema_1 = require("./schema");
const password_service_1 = require("../modules/auth/password.service");
async function seedSuperAdmin(database, passwords, environment) {
    const input = zod_1.z
        .object({
        SUPER_ADMIN_EMAIL: zod_1.z.email().transform((s) => s.toLowerCase().trim()),
        SUPER_ADMIN_PASSWORD: zod_1.z.string().min(16).max(128),
        SUPER_ADMIN_NAME: zod_1.z.string().trim().min(2).max(100).default('Arogio Super Admin'),
    })
        .parse(environment);
    return database.db.transaction(async (tx) => {
        const [existing] = await tx
            .select()
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.email, input.SUPER_ADMIN_EMAIL))
            .limit(1)
            .for('update');
        if (existing) {
            if (existing.role !== 'super_admin')
                throw new Error('This email belongs to a user account. Use a dedicated administrator email.');
            return { id: existing.id, created: false };
        }
        const [admin] = await tx
            .insert(schema_1.users)
            .values({
            email: input.SUPER_ADMIN_EMAIL,
            fullName: input.SUPER_ADMIN_NAME,
            passwordHash: await passwords.hash(input.SUPER_ADMIN_PASSWORD),
            role: 'super_admin',
            status: 'active',
        })
            .returning({ id: schema_1.users.id });
        return { id: admin.id, created: true };
    });
}
async function main() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule, { logger: false });
    try {
        const result = await seedSuperAdmin(app.get(database_service_1.DatabaseService), new password_service_1.PasswordService(), process.env);
        console.log(`Super admin ${result.created ? 'created' : 'already exists'}: ${result.id}`);
    }
    finally {
        await app.close();
    }
}
if (require.main === module)
    void main().catch(() => {
        console.error('Super-admin seed failed. Check the database, migration and SUPER_ADMIN_EMAIL/PASSWORD/NAME configuration. Existing credentials are never reset.');
        process.exitCode = 1;
    });
//# sourceMappingURL=seed-super-admin.js.map