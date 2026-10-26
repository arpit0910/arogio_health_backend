import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { users, type User } from '../../database/schema';
import type { HeightUnit, WeightUnit } from '../../common/health/measurements';

@Injectable()
export class UsersRepository {
  constructor(private readonly database: DatabaseService) {}

  async findById(id: string): Promise<User | undefined> {
    const [user] = await this.database.db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  }

  async updateProfile(
    id: string,
    changes: {
      profileSetup?: Record<string, unknown>;
      profileCompletedAt?: Date;
      fullName?: string;
      username?: string;
      heightValue?: number;
      heightUnit?: HeightUnit;
      weightValue?: number;
      weightUnit?: WeightUnit;
      heightCm?: number;
      weightKg?: number;
    },
  ): Promise<User | undefined> {
    const [user] = await this.database.db
      .update(users)
      .set({ ...changes, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }
}
