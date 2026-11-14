import { Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { authSessions, users, type User } from '../../database/schema';
import type { HeightUnit, WeightUnit } from '../../common/health/measurements';

@Injectable()
export class UsersRepository {
  constructor(private readonly database: DatabaseService) {}

  async softDelete(id: string) {
    return this.database.db.transaction(async (tx) => {
      const now = new Date(),
        recoverableUntil = new Date(now.getTime() + 30 * 86400000);
      const [user] = await tx
        .update(users)
        .set({ status: 'disabled', deletionRequestedAt: now, recoverableUntil, updatedAt: now })
        .where(and(eq(users.id, id), eq(users.status, 'active')))
        .returning();
      if (!user) return undefined;
      await tx
        .update(authSessions)
        .set({ revokedAt: now })
        .where(and(eq(authSessions.userId, id), isNull(authSessions.revokedAt)));
      return {
        deletionRequestedAt: now.toISOString(),
        recoverableUntil: recoverableUntil.toISOString(),
      };
    });
  }

  async findById(id: string): Promise<User | undefined> {
    const [user] = await this.database.db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  }

  async applyReferral(
    userId: string,
    code: string,
  ): Promise<
    | { kind: 'saved'; user: User }
    | { kind: 'unavailable' | 'closed' | 'invalid' | 'self' | 'already-set' }
  > {
    return this.database.db.transaction(async (tx) => {
      const [user] = await tx
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
        .for('update');
      if (!user || user.status !== 'active') return { kind: 'unavailable' };
      const [referrer] = await tx.select().from(users).where(eq(users.referralCode, code)).limit(1);
      if (!referrer || referrer.status !== 'active' || !referrer.profileCompletedAt)
        return { kind: 'invalid' };
      if (user.id === referrer.id) return { kind: 'self' };
      if (user.referredByUserId === referrer.id) return { kind: 'saved', user };
      if (user.referredByUserId) return { kind: 'already-set' };
      if (user.profileCompletedAt) return { kind: 'closed' };
      const [updated] = await tx
        .update(users)
        .set({ referredByUserId: referrer.id, referredAt: new Date(), updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();
      return { kind: 'saved', user: updated! };
    });
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
      .where(and(eq(users.id, id), eq(users.status, 'active')))
      .returning();
    return user;
  }
}
