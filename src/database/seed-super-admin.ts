import { NestFactory } from '@nestjs/core';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { AppModule } from '../app.module';
import { DatabaseService } from './database.service';
import { users } from './schema';
import { PasswordService } from '../modules/auth/password.service';
export async function seedSuperAdmin(
  database: DatabaseService,
  passwords: PasswordService,
  environment: NodeJS.ProcessEnv,
) {
  const input = z
    .object({
      SUPER_ADMIN_EMAIL: z.email().transform((s) => s.toLowerCase().trim()),
      SUPER_ADMIN_PASSWORD: z.string().min(16).max(128),
      SUPER_ADMIN_NAME: z.string().trim().min(2).max(100).default('Arogio Super Admin'),
    })
    .parse(environment);
  return database.db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(users)
      .where(eq(users.email, input.SUPER_ADMIN_EMAIL))
      .limit(1)
      .for('update');
    if (existing) {
      if (existing.role !== 'super_admin')
        throw new Error(
          'This email belongs to a user account. Use a dedicated administrator email.',
        );
      return { id: existing.id, created: false };
    }
    const [admin] = await tx
      .insert(users)
      .values({
        email: input.SUPER_ADMIN_EMAIL,
        fullName: input.SUPER_ADMIN_NAME,
        passwordHash: await passwords.hash(input.SUPER_ADMIN_PASSWORD),
        role: 'super_admin',
        status: 'active',
      })
      .returning({ id: users.id });
    return { id: admin!.id, created: true };
  });
}
async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  try {
    const result = await seedSuperAdmin(
      app.get(DatabaseService),
      new PasswordService(),
      process.env,
    );
    console.log(`Super admin ${result.created ? 'created' : 'already exists'}: ${result.id}`);
  } finally {
    await app.close();
  }
}
if (require.main === module)
  void main().catch(() => {
    console.error(
      'Super-admin seed failed. Check the database, migration and SUPER_ADMIN_EMAIL/PASSWORD/NAME configuration. Existing credentials are never reset.',
    );
    process.exitCode = 1;
  });
